/** SplashScreen — first-run / signed-out front door of the desktop app.
 *
 * No sessions, surfaces, or chat are reachable before authentication:
 * everything in the workspace is owned by a signed-in user.
 */

import { useStore } from "../../store";

import "./index.css";

export function SplashScreen() {
  const openSignIn = useStore((s) => s.openSignIn);

  return (
    <div className="ha-splash" role="dialog" aria-label="Welcome to Human Assist">
      <div className="ha-splash-card">
        <span className="ha-splash-logo" aria-hidden>
          ✦
        </span>
        <h1 className="ha-splash-title">Human Assist</h1>
        <p className="ha-splash-tagline">
          Your human-in-the-loop workspace — sessions, curated web, and
          agent surfaces, tied to your account.
        </p>
        <div className="ha-splash-actions">
          <button
            className="ha-btn ha-btn--primary ha-splash-btn"
            onClick={() => openSignIn("signin")}
          >
            Sign in
          </button>
          <button
            className="ha-btn ha-splash-btn"
            onClick={() => openSignIn("register")}
          >
            Create account
          </button>
        </div>
        <p className="ha-splash-foot">
        Create an account to get started — it takes a moment, and your
        workspace comes with you.
        </p>
      </div>
    </div>
  );
}

export default SplashScreen;
