/** SessionEmptyGuide — shown in the main content when the active
 * session exists but has no surfaces yet (e.g., an agent just bound
 * its session via bindAgentSession). Doubles as the "how do I invoke
 * surfaces" instruction page.
 */

import { useStore } from "../../store";
import type { SessionDoc } from "../../services/sync/types";

import "./index.css";

interface ToolHint {
  tool: string;
  what: string;
  try: string;
}

const TOOL_HINTS: ToolHint[] = [
  { tool: "openBrowserSurface", what: "Interactive browser pane (agent can drive it)", try: "“open https://react.dev in a browser surface”" },
  { tool: "openInputSurface", what: "Ask me a question (text / choices / confirm)", try: "“ask me to approve the refactor”" },
  { tool: "openCodeDiff", what: "Review a unified diff", try: "“show the auth-guard diff for review”" },
  { tool: "openCanvasSurface", what: "Render a visual / diagram prompt", try: "“show the release plan on a canvas”" },
  { tool: "openImageSurface", what: "Display an image for review", try: "“show this chart: <url>”" },
  { tool: "openScreenCapture", what: "Grab the screen for context", try: "“capture my screen”" },
  { tool: "openTerminalOutput", what: "Stream command output", try: "“show the test run output”" },
  { tool: "openProcessManager", what: "Supervised background processes (start/stop/restart)", try: "“start the dev server and track it”" },
  { tool: "showMessage", what: "Toast notification", try: "“toast ‘build done’ with level success”" },
  { tool: "browserNavigate / Snapshot / Click / Type / Screenshot", what: "Agent drives an open browser pane", try: "“look up React Native docs”" },
  { tool: "browserHandoff", what: "Give ME control (CAPTCHAs, logins)", try: "auto-triggered when a check appears" },
];

export interface SessionEmptyGuideProps {
  session: SessionDoc;
}

export function SessionEmptyGuide({ session }: SessionEmptyGuideProps) {
  const mcpPort = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("mcpPort") ?? "3615"
    : "3615";

  return (
    <div className="ha-session-guide" data-testid="session-guide">
      <div className="ha-session-guide-head">
        <h2 className="ha-session-guide-title">{session.title}</h2>
        <p className="ha-session-guide-sub">
          This session has no surfaces yet. Ask your agent to use the{" "}
          <code>human-assist</code> MCP server (ws://127.0.0.1:43179/mcp ·
          http://localhost:{mcpPort}/mcp) — everything it opens will appear
          here.
        </p>
      </div>

      <div className="ha-session-guide-grid">
        {TOOL_HINTS.map((h) => (
          <div key={h.tool} className="ha-session-guide-card">
            <code className="ha-session-guide-tool">{h.tool}</code>
            <span className="ha-session-guide-what">{h.what}</span>
            <span className="ha-session-guide-try">{h.try}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function useActiveSession(): SessionDoc | null {
  return useStore((s) =>
    s.activeSessionId
      ? (s.sessions.find((x) => x.id === s.activeSessionId) ?? null)
      : null,
  );
}

export default SessionEmptyGuide;
