/** Human Assist — Sign In screen.

Centered card with Google sign-in and email/password form.
Displayed when user is unauthorized.
*/

import { useState } from "react";
import "./index.css";

export interface SignInScreenProps {
  onGoogleSignIn: () => void;
  onEmailSignIn: (email: string, password: string) => void;
  error?: string;
}

function SignInScreen({ onGoogleSignIn, onEmailSignIn, error }: SignInScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEmailSignIn(email, password);
  };

  return (
    <div className="ha-signin-screen">
      <div className="ha-signin-card">
        <div className="ha-signin-header">
          <div className="ha-signin-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </div>
          <h1 className="ha-signin-title">Human Assist</h1>
          <p className="ha-signin-subtitle">Claude Code's surface companion</p>
        </div>

        {/* ── Google Sign In ─────────────────────────────────────── */}
        <button className="ha-signin-btn ha-signin-btn--google" onClick={onGoogleSignIn}>
          <span className="ha-signin-btn-icon">G</span>
          <span>Continue with Google</span>
        </button>

        {/* ── Toggle Email ───────────────────────────────────────── */}
        {!showEmail ? (
          <button className="ha-signin-toggle" onClick={() => setShowEmail(true)}>
            Sign in with email
          </button>
        ) : (
          <>
            <form className="ha-signin-form" onSubmit={handleSubmit}>
              {error && <div className="ha-signin-error">{error}</div>}
              <div className="ha-signin-field">
                <label>Email</label>
                <input
                  type="email"
                  className="ha-signin-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="ha-signin-field">
                <label>Password</label>
                <input
                  type="password"
                  className="ha-signin-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="ha-signin-actions">
                <button type="button" className="ha-signin-btn ha-signin-btn--secondary" onClick={() => setShowEmail(false)}>
                  Back
                </button>
                <button type="submit" className="ha-signin-btn ha-signin-btn--primary">
                  Sign In
                </button>
              </div>
            </form>
          </>
        )}

        <div className="ha-signin-reqs">
          Requires Claude Code + Human Assist MCP extension
        </div>
      </div>
    </div>
  );
}

export { SignInScreen };
