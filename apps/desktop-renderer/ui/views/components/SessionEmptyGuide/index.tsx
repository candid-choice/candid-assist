/** SessionEmptyGuide — the instruction page for a session with no
 * surfaces yet.
 *
 * Framing: lead with what a plain IDE/coding agent CANNOT do —
 * persistent-authenticated web agency (search, Google Drive, ChatGPT,
 * selective scraping), consent-gated, with human handoff for logins —
 * plus decision surfaces (diffs, questions, processes). Ordinary
 * conveniences (images, terminal echoes) are demoted to "also works".
 */

import { useStore } from "../../store";
import type { SessionDoc } from "../../services/sync/types";

import "./index.css";

interface Hint {
  title: string;
  try: string[];
}

interface Section {
  icon: string;
  heading: string;
  blurb: string;
  tier: "unique" | "roadmap" | "utility";
  hints: Hint[];
}

const SECTIONS: Section[] = [
  {
    icon: "🌐",
    heading: "The authenticated web — what this is for",
    blurb:
      "A regular IDE can open a file; it cannot log into your Google account, remember the login, and act on your behalf later. Here the embedded browser keeps a persistent Chrome profile: sign in once, and future agent sessions reuse it. Every new domain requires your consent first (Allow once / Always allow / Deny), and CAPTCHAs or 2FA pause the agent and hand you the keyboard.",
    tier: "unique",
    hints: [
      {
        title: "Search & research",
        try: [
          "“google ‘best 2026 e-cad web renderers’ and summarize the top 3”",
          "“look up React Native perf docs and save the key APIs”",
        ],
      },
      {
        title: "Google Drive / authenticated docs",
        try: [
          "“open my Google Drive → Team Docs → read the Q3 spec and list open questions”",
          "first visit asks you to sign in — the login is remembered for next time",
        ],
      },
      {
        title: "ChatGPT / SaaS round-trips",
        try: [
          "“ask ChatGPT to critique this RFC, then bring the answer back”",
          "each use prompts for your permission per domain",
        ],
      },
      {
        title: "Selective scraping",
        try: [
          "“scrape the pricing table from acme.dev/pricing into a markdown table”",
          "the agent reads the page via snapshot — you watch it happen live",
        ],
      },
      {
        title: "Human handoff (logins, CAPTCHA, 2FA)",
        try: [
          "agent calls browserHandoff → pane locks with ‘Your turn’",
          "you solve it, click Done — automation resumes with your session",
        ],
      },
    ],
  },
  {
    icon: "⚖️",
    heading: "You stay in the loop",
    blurb: "Surfaces that demand a human decision — not just output to look at.",
    tier: "unique",
    hints: [
      {
        title: "Answer the agent (❓ Input)",
        try: ["“ask me which auth strategy before you code it”"],
      },
      {
        title: "Approve diffs (🔀 Code Diff)",
        try: ["“show the migration diff for approval before applying”"],
      },
      {
        title: "Supervised processes (⚙️ Processes)",
        try: [
          "“start the dev server and keep it in the process manager”",
          "you can stop / restart anything the agent launches",
        ],
      },
    ],
  },
  {
    icon: "🧊",
    heading: "Workbenches the IDE can’t host",
    blurb: "Rich, purpose-built viewers that would need multiple IDE plugins.",
    tier: "unique",
    hints: [
      {
        title: "🧊 3D modeling (three.js viewer) — live",
        try: [
          "“render the enclosure as an interactive 3D model with a torus gasket”",
          "agent pushes primitives (box/sphere/cylinder/torus/plane); you orbit, zoom, pan",
        ],
      },
    ],
  },
  {
    icon: "🧪",
    heading: "More workbenches (roadmap)",
    blurb: "Next up on the surfaces roadmap.",
    tier: "roadmap",
    hints: [
      {
        title: "🔌 Circuit JSON / E-CAD preview",
        try: ["“preview this netlist/circuit JSON as a schematic”"],
      },
      {
        title: "🖥️ Live webdev preview",
        try: ["“run the landing page and let me review it side-by-side”"],
      },
    ],
  },
  {
    icon: "🧰",
    heading: "Also works (but your IDE can do these too)",
    blurb: "Fine for convenience — not why you’d open this app.",
    tier: "utility",
    hints: [
      {
        title: "🖼️ Images · 🎨 Canvas prompts · 📸 screen capture · 🖥️ terminal echoes",
        try: ["“toast ‘build done’”, “show this chart”, “capture my screen”"],
      },
    ],
  },
];

export interface SessionEmptyGuideProps {
  /** Null when no session is selected — renders the generic usage guide. */
  session: SessionDoc | null;
}

export function SessionEmptyGuide({ session }: SessionEmptyGuideProps) {
  return (
    <div className="ha-session-guide" data-testid="session-guide">
      <div className="ha-session-guide-head">
        <h2 className="ha-session-guide-title">
          {session ? session.title : "Candid Assist — how to use it"}
        </h2>
        <p className="ha-session-guide-sub">
          {session
            ? "Session is live but has no surfaces yet. Ask your agent to use the " +
              "human-assist MCP server — this app is where the agent can " +
              "be on the web as you, and render things an IDE can’t."
            : "Select a session on the left (or click the empty sidebar to " +
              "deselect), start a new task, or connect an agent over the " +
              "human-assist MCP server. Surfaces appear here, scoped to the " +
              "selected session. Here’s what makes this worth opening:"}
        </p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.heading} className="ha-guide-section" data-tier={section.tier}>
          <h3 className="ha-guide-section-head">
            <span aria-hidden>{section.icon}</span> {section.heading}
            {section.tier === "roadmap" && <span className="ha-guide-badge">coming soon</span>}
          </h3>
          <p className="ha-guide-blurb">{section.blurb}</p>
          <div className="ha-guide-grid">
            {section.hints.map((hint) => (
              <div key={hint.title} className="ha-guide-card">
                <div className="ha-guide-card-title">{hint.title}</div>
                <ul className="ha-guide-tries">
                  {hint.try.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function useActiveSession(): SessionDoc | null {
  return useStore((s) =>
    s.activeSessionId ? (s.sessions.find((x) => x.id === s.activeSessionId) ?? null) : null,
  );
}

export default SessionEmptyGuide;
