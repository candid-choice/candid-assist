# Part 1 — User Interaction Flow (Mermaid Sequence)

Complete end-to-end interaction sequence from app launch to active session.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant APP as Desktop App
    participant WEB as Web Dashboard
    participant BACKEND as NestJS Backend
    participant FIREBASE as Firebase Auth / Firestore
    participant CLAUDE as Claude Code (via MCP)

    Note over U,CLAUDE: PHASE 1 — First Launch (No Auth)
    rect rgb(245,245,245)
        U->>APP: Open app from Dock / Spotlight
        APP->>APP: Check auth token in keychain (none)
        APP->>U: Show screen: Welcome / Sign In
        Note over U: Screen: Welcome / Sign In<br/>• App logo + tagline<br/>• "Sign in with Google" button<br/>• "Sign in with email" link<br/>• System requirements note (macOS 13+)
        U->>APP: Click "Sign in with Google"

        APP->>FIREBASE: signInWithPopup(GoogleProvider)
        FIREBASE-->>APP: ID token + profileå (name, email, photo)
        APP->>BACKEND: POST /auth/register {id, email, name}
        BACKEND->>FIREBASE: Create user document in Firestore
        FIREBASE-->>BACKEND: User created
        BACKEND-->>APP: Success + user profile
        APP->>APP: Store token in keychain

        alt First launch ever
            APP->>U: Show screen: Onboarding (3-step wizard)
            Note over U: Step 1: Connect your code repo (GitHub / local dir)<br/>Step 2: Choose Claude Code setup (prompt file?)<br/>Step 3: Confirm MCP connection is live
            U->>APP: Configure code source
            APP->>BACKEND: POST /workspace/connect {path, gitUrl, type}
            BACKEND->>FIREBASE: Save workspace config
            FIREBASE-->>BACKEND: Saved
            BACKEND-->>APP: Workspace connected
            U->>APP: Next (through all steps)
        else Returning user
            APP->>U: Show screen: Dashboard (empty state)
        end
    end

    Note over U,CLAUDE: PHASE 2 — Dashboard (Initial Empty State)
    rect rgb(235,245,235)
        U->>APP: View Dashboard
        Note over U: Left sidebar: app title, Sessions (empty), Settings<br/>Main area: "Waiting for Claude — tell Claude to use Human Assist"<br/>• "Open terminal" quick action (opens help palette)<br/>• "Review code" quick action (opens help palette)<br/>• "Draw something" quick action (opens help palette)
        U->>APP: Open help palette (⌘+Shift+Space) or type a task in Task Composer

        APP->>APP: Show screen: Task Composer
        Note over U: Command palette (slides up from bottom)<br/>• Large text area: "Describe what you want Claude to help with"<br/>• Attachment button (drag files or click to add)<br/>• "Send to Claude" primary button<br/>• "Attach context" — files, URLs, screenshots
        U->>APP: Type request + attach files
        U->>APP: Click "Send to Claude"

        APP->>BACKEND: POST /sessions {description, files[], context}
        BACKEND->>FIREBASE: Create session document {status: "active", ...}
        BACKEND-->>APP: Session {id, status: "active"}
        APP->>U: Show screen: Dashboard (active session appears)
    end

    Note over U,CLAUDE: PHASE 3 — Claude Pushes a Surface
    rect rgb(255,245,225)
        CLAUDE->>APP: MCP fires: openSurface(type=input, payload={kind:choices, question: "...", options:[...]})
        APP->>APP: Update store: activeSurface = new surface
        APP->>U: Surface overlay appears over current view
        Note over U: Surface overlay with top bar (title + close),<br/>content area, and action area (buttons/input)<br/>• "✦ Human Assist" title bar<br/>• Content: the surface content<br/>• Footer: action buttons
        U->>APP: Interact with the surface
        U->>APP: Click "Confirm" button (or choose option, or type text)
        APP->>APP: Package result {completed: true, data: {...}}
        APP->>CLAUDE: Send result via MCP (HTTP)
        CLAUDE->>CLAUDE: Continues execution with user's input
    end

    Note over U,CLAUDE: PHASE 4 — User Switches Between Sessions & Surfaces
    rect rgb(235,235,250)
        U->>APP: Click another session in left sidebar
        APP->>APP: Switch activeViewId, load session's surfaces
        APP->>U: Show session's surface content
        Note over U: Same surface rendering engine —<br/>BrowserSurface, CanvasSurface, ScreenCaptureSurface, CodeDiffSurface, ProcessManager, TerminalSurface, ImageSurface
        U->>APP: Open HelpPalette (⌘+Shift+Space)
        APP->>U: HelpPalette slides from bottom-right
        Note over U: HelpPalette: 6 shortcut buttons (new surface set)<br/>• 📸 Capture screen (ScreenCaptureSurface)<br/>• ✏️ Annotate image (ImageSurface)<br/>• ◇ Sketch on canvas (CanvasSurface)<br/>• 📄 Review changes (CodeDiffSurface)<br/>• ⌛ View terminal (TerminalSurface)<br/>• ⚡ Manage processes (ProcessManager)<br/>• 📸 Capture screen<br/>• ✏️ Annotate image<br/>• ◇ Sketch on canvas<br/>• 📄 Review changes<br/>• ⌛ View terminal<br/>• ⚡ Manage processes<br/>• No file picker, voice, text input, or confirmations — handled in terminal chat
        U->>APP: Click "Capture screen"
        APP->>APP: ScreenCaptureSurface opens (region/window/fullscreen mode)
        U->>APP: Select region, click "Done"
        APP->>APP: Capture result → send to Claude
        CLAUDE->>CLAUDE: Processes screenshot
    end

    Note over U,CLAUDE: PHASE 5 — User Manages Active Sessions
    rect rgb(240,240,240)
        U->>APP: Click "Sessions" in left sidebar
        APP->>U: Show screen: Sessions List
        Note over U: List of all sessions (active first, then archived)<br/>• Each entry: title, status badge, last message, timestamp<br/>• Status: ● Active / ○ Waiting / ✓ Done / ✕ Error<br/>• Click to open session details<br/>• Right-click: Rename, Archive, Delete
        U->>APP: Click on an active session
        APP->>U: Show screen: Session Detail
    end

    Note over U,CLAUDE: PHASE 6 — Settings & Configuration
    rect rgb(250,235,235)
        U->>APP: Click "Settings" in left sidebar
        APP->>U: Show screen: Settings
        Note over U: Settings sections:<br/>• Account (profile, sign out)<br/>• Workspace (code path, git repo)<br/>• Appearance (theme, font size, sidebar width)<br/>• Notifications (toast, banner, sound)<br/>• Keyboard Shortcuts (customizable)<br/>• Claude Connection (MCP status, API key, logs)
        U->>APP: Change workspace path
        APP->>BACKEND: PUT /workspace {path: "..."}
        BACKEND->>FIREBASE: Update workspace config
        FIREBASE-->>BACKEND: Updated
        BACKEND-->>APP: Saved
        APP->>U: Show "Saved" toast notification
        U->>APP: Click "Sign out"
        APP->>APP: Clear keychain tokens
        APP->>U: Show screen: Welcome / Sign In
    end

    Note over U,CLAUDE: PHASE 7 — Notifications & Background Events
    rect rgb(235,250,235)
        CLAUDE->>APP: Background: surface pushed while app is in background
        APP->>APP: Generate native macOS notification
        APP->>U: macOS banner notification appears
        Note over U: "Claude needs your help"<br/>"Review this code change and approve?"<br/>• Open (brings app to foreground)<br/>• Dismiss
        U->>APP: Click notification
        APP->>APP: Bring to foreground
        APP->>U: Show Surface overlay with pending surface
        Note over U: If user dismissed the surface while app was background,<br/>it remains in the session — clicking notification shows it
    end

    Note over U,CLAUDE: PHASE 8 — Task History & Past Sessions
    rect rgb(250,250,225)
        U->>APP: Click "History" in left sidebar
        APP->>U: Show screen: History
        Note over U: All past sessions, grouped by date<br/>• "Today", "Yesterday", "Last 7 days", "Earlier"<br/>• Search bar at top<br/>• Filter by status, tags<br/>• Click any session to open details<br/>• Session detail: full conversation, all surfaces,<br/>  user responses, Claude's actions, timeline
        U->>APP: Type in search
        APP->>U: Filter sessions in real-time
        U->>APP: Right-click session → "Duplicate"
        APP->>BACKEND: POST /sessions/duplicate {id}
        BACKEND->>FIREBASE: Create clone of session
        BACKEND-->>APP: New session created
        APP->>U: Navigate to new session
    end

    Note over U,CLAUDE: PHASE 9 — Surface Type Variants
    rect rgb(250,235,250)
        # NOTE: InputSurface types (text, confirm, choices, voice, file) are handled
        # in terminal chat between Claude Code and the user — no surface is pushed.
        # Human Assist only shows surfaces for things Claude CANNOT do from the terminal.

        CLAUDE->>APP: openSurface(type="browser", payload={url:"..."})
        APP->>U: Show BrowserSurface
        Note over U: Embedded web view (WKWebView)<br/>• URL bar at top (editable)<br/>• Back/Forward/Reload<br/>• Full embedded page content<br/>• Screenshot, Open External<br/>• User navigates, clicks, types, reports back
        U->>APP: Click "Submit"
        APP->>CLAUDE: Send {response: "Checkout is missing a coupon field"}

        CLAUDE->>APP: openSurface(type="canvas", payload={...})
        APP->>U: Show CanvasSurface
        Note over U: Interactive canvas with drawing tools<br/>• Pen, Eraser, Highlighter, Text<br/>• Undo/Redo (50 steps), Zoom, Clear<br/>• User annotates Claude's drawing
        U->>APP: Draw annotation on canvas
        U->>APP: Click "Send"
        APP->>CLAUDE: Send {strokes: [...], notes: "This is the flow I was thinking of."}

        CLAUDE->>APP: openSurface(type="image", payload={src:"...", annotationCount:3})
        APP->>U: Show ImageSurface
        Note over U: Image viewer<br/>• Large image display<br/>• Pinch-to-zoom, scroll<br/>• Annotation tools (arrows, circles, text, highlighter)<br/>• "Save & Send" sends annotated image to Claude
        U->>APP: Draw annotation on image
        U->>APP: Click "Send"
        APP->>CLAUDE: Send {image, annotations: [circle, arrow, text]}

        CLAUDE->>APP: openSurface(type="screen", payload={mode:"region"})
        APP->>U: ScreenCaptureSurface
        Note over U: macOS screen capture overlay<br/>• Region (drag), Window (click), Full Screen (entire display)<br/>• Sends a screenshot image to Claude
        U->>APP: Select area, release
        APP->>CLAUDE: Send screenshot image

        CLAUDE->>APP: openSurface(type="code-diff", payload={files: [...]})
        APP->>U: Show CodeDiffSurface
        Note over U: Structured diff viewer<br/>• Side-by-side or unified view<br/>• Inline comments, file-level status badges<br/>• Approve / Request changes
        U->>APP: Click "Approve"
        APP->>CLAUDE: Send {decision: "approved", annotations: [...]}

        CLAUDE->>APP: openSurface(type="process-manager", payload={processes:[...]})
        APP->>U: Show ProcessManager
        Note over U: Live process list with status (running/stopped/crashed)<br/>• View log, Stop, Restart, Archive<br/>• Process list is scoped to the current workspace
        U->>APP: Click "Stop"
        APP->>CLAUDE: Send {action: "stopped", pid: 12345}

        CLAUDE->>APP: openSurface(type="terminal", payload={command:"npm test", output:"..."})
        APP->>U: Show TerminalSurface
        Note over U: Scrollable terminal output stream<br/>• Search lines, Copy text, Re-run command<br/>• Sends text output back to Claude (not a screenshot)
        U->>APP: Click "Send to Claude"
        APP->>CLAUDE: Send {terminal_output: "PASS 3 tests
FAIL 1 test
..."}
    end

    Note over U,CLAUDE: PHASE 10 — Session Lifecycle
    rect rgb(235,250,250)
        U->>APP: Session active, Claude running in background
        Note over U: Sidebar shows session count badge<br/>• "3 active" with number badge<br/>• Click to scroll to active sessions

        Note over CLAUDE: Claude finishes a subtask
        CLAUDE->>APP: openSurface(type="prompt", payload={...})
        APP->>U: Show prompt surface — Claude asks a question
        U->>APP: Respond via surface
        APP->>CLAUDE: Send response
        CLAUDE->>CLAUDE: Continues processing

        Note over CLAUDE: Eventually Claude finishes
        CLAUDE->>APP: openSurface(type="prompt", payload={question: "All done! Summary of what I did: ..."})
        APP->>U: Show completion summary surface
        U->>APP: Read summary, close surface
        APP->>APP: Mark session as "done" in store
        APP->>BACKEND: PATCH /sessions/:id {status: "done"}
        BACKEND->>FIREBASE: Update session status
        FIREBASE-->>APP: Updated
        APP->>U: Session moves to bottom of list<br/>Status badge changes to ✓ Done
        U->>APP: Click "Archive" on completed session
        APP->>BACKEND: PATCH /sessions/:id {status: "archived"}
        BACKEND->>FIREBASE: Update session status
        BACKEND-->>APP: Archived
        APP->>U: Session removed from active view
    end
```
