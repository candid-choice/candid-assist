/** Sign-In Screen — the only way into the workspace.
 *
 * There is deliberately NO dismiss/close affordance: sessions, surfaces,
 * and chat all belong to a signed-in user, so the app gates on auth.
 * Modes (sign in / create account) come from the store so the splash
 * screen can deep-link straight into registration.
 */

import { useState } from "react";

import { useAuth } from "../../context/auth-provider";
import { useStore } from "../../store";

import "./index.css";

export function SignInScreen(_props: { onDismiss?: () => void }) {
  const { signInWithGoogle, signInWithEmail, registerWithEmail, isLoading } = useAuth();
  const mode = useStore((s) => s.signInMode);
  const setMode = useStore((s) => s.setSignInMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailMode, setEmailMode] = useState(mode === "register");

  const register = mode === "register";

  const handleGoogleSignIn = () => {
    setError("");
    signInWithGoogle().catch(() => {
      setError("Failed to sign in with Google");
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    if (register && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    const run = register
      ? registerWithEmail(email, password, name || undefined)
      : signInWithEmail(email, password);
    run.catch((err: any) => {
      setError(err?.message || (register ? "Registration failed" : "Invalid email or password"));
    });
  };

  const switchMode = (next: "signin" | "register") => {
    setMode(next);
    setError("");
    if (next === "register") setEmailMode(true);
  };

  return (
    <div className="ha-signin-screen">
      <div className="ha-signin-card">
        {/* Logo & title */}
        <div className="ha-signin-header">
          <span className="ha-signin-logo">✦</span>
          <h1 className="ha-signin-title">
            {register ? "Create your account" : "Welcome back"}
          </h1>
          <p className="ha-signin-subtitle">
            {register
              ? "Your sessions, surfaces, and chats live with your account"
              : "Sign in to open your workspace"}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="ha-signin-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={!register}
            className={`ha-signin-tab${!register ? " ha-signin-tab--active" : ""}`}
            onClick={() => switchMode("signin")}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={register}
            className={`ha-signin-tab${register ? " ha-signin-tab--active" : ""}`}
            onClick={() => switchMode("register")}
          >
            Create account
          </button>
        </div>

        {/* Error (both modes) */}
        {error && <div className="ha-signin-error">{error}</div>}

        {/* Google Sign In — sign-in mode only */}
        {!register && !emailMode && (
          <>
            <button
              className="ha-btn ha-btn--google"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <span className="ha-btn-icon">G</span>
              Sign in with Google
            </button>
            <button className="ha-signin-toggle" onClick={() => setEmailMode(true)}>
              Sign in with email
            </button>
          </>
        )}

        {/* Email form */}
        {(emailMode || register) && (
          <form className="ha-signin-form" onSubmit={handleSubmit}>
            {register && (
              <div className="ha-signin-field">
                <label>Name</label>
                <input
                  className="ha-signin-input"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}
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
                autoComplete={register ? "new-password" : "current-password"}
              />
            </div>
            <div className="ha-signin-actions">
              <button type="submit" className="ha-btn ha-btn--primary" disabled={isLoading}>
                {isLoading ? "Please wait…" : register ? "Create account" : "Sign in"}
              </button>
              {!register && (
                <button
                  type="button"
                  className="ha-btn"
                  onClick={() => {
                    setEmailMode(false);
                    setError("");
                  }}
                >
                  Back
                </button>
              )}
            </div>
          </form>
        )}

        {/* System requirements */}
        <p className="ha-signin-reqs">Requires macOS 13+ · backend at localhost:3601</p>
      </div>
    </div>
  );
}

export default SignInScreen;
