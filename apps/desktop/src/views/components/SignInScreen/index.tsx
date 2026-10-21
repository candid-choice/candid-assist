/** Sign-In Screen — first screen after app launch (no auth). */

import { useState } from "react";

import { useAuth } from "../../context/auth-provider";

import "./index.css";

export function SignInScreen() {
  const { signInWithGoogle, signInWithEmail, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailMode, setEmailMode] = useState(false);

  const handleGoogleSignIn = () => {
    setError("");
    signInWithGoogle().catch(() => {
      setError("Failed to sign in with Google");
    });
  };

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    signInWithEmail(email, password).catch(() => {
      setError("Invalid email or password");
    });
  };

  return (
    <div className="ha-signin-screen">
      <div className="ha-signin-card">
        {/* Logo & title */}
        <div className="ha-signin-header">
          <span className="ha-signin-logo">✦</span>
          <h1 className="ha-signin-title">Human Assist</h1>
          <p className="ha-signin-subtitle">
            Your shared workspace with Claude Code
          </p>
        </div>

        {/* Google Sign In */}
        {!emailMode && (
          <button
            className="ha-btn ha-btn--google"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <span className="ha-btn-icon">G</span>
            Sign in with Google
          </button>
        )}

        {/* Email form toggle */}
        {!emailMode && (
          <button className="ha-signin-toggle" onClick={() => setEmailMode(true)}>
            Sign in with email
          </button>
        )}

        {/* Email password form */}
        {emailMode && (
          <form className="ha-signin-form" onSubmit={handleEmailSignIn}>
            {error && <div className="ha-signin-error">{error}</div>}
            <div className="ha-signin-field">
              <label>Email</label>
              <input
                className="ha-signin-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="ha-signin-field">
              <label>Password</label>
              <input
                className="ha-signin-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="ha-signin-actions">
              <button type="submit" className="ha-btn ha-btn--primary" disabled={isLoading}>
                {isLoading ? "Signing in…" : "Sign in"}
              </button>
              <button type="button" className="ha-btn" onClick={() => { setEmailMode(false); setError(""); }}>
                Back
              </button>
            </div>
          </form>
        )}

        {/* System requirements */}
        <p className="ha-signin-reqs">Requires macOS 13+ and Claude Code 0.4+</p>
      </div>
    </div>
  );
}
