/** Human Assist — Onboarding Wizard.

3-step wizard that appears on first sign-in:
1. MCP server running
2. Claude Code configuration
3. Verify connection

Uses a step indicator at top, content in middle, and navigation at bottom.
*/

import { useState, useEffect } from "react";
import { IconArrowLeft, IconCheck, IconLoader } from "@tabler/icons-react";
import "./index.css";

export type OnboardingStep = "connect" | "configure" | "verify";

export interface OnboardingWizardProps {
  onStepComplete: (step: OnboardingStep) => void;
  onComplete: () => void;
}

function OnboardingWizard({ onStepComplete, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<OnboardingStep>("connect");
  const [loading, setLoading] = useState(false);

  // Auto-advance after simulated work
  useEffect(() => {
    if (step === "connect") {
      const t = setTimeout(() => {
        onStepComplete("connect");
      }, 2000);
      return () => clearTimeout(t);
    }
    if (step === "configure") {
      onStepComplete("configure");
    }
  }, [step, onStepComplete]);

  const steps: { key: OnboardingStep; label: string }[] = [
    { key: "connect", label: "Connect" },
    { key: "configure", label: "Configure" },
    { key: "verify", label: "Verify" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === step);

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setLoading(true);
      const nextStep = steps[currentIndex + 1].key;
      setTimeout(() => {
        setStep(nextStep);
        setLoading(false);
      }, 500);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1].key);
    }
  };

  return (
    <div className="ha-onboarding">
      {/* ── Step Indicator ─────────────────────────────────────────── */}
      <div className="ha-onboarding-steps">
        {steps.map((s, i) => (
          <div key={s.key} className="ha-onboarding-step">
            <div className={`ha-onboarding-step-dot ${i <= currentIndex ? "active" : ""} ${i < currentIndex ? "complete" : ""}`}>
              {i < currentIndex ? (
                <IconCheck size={14} />
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            {i < steps.length - 1 && <div className={`ha-onboarding-step-line ${i < currentIndex ? "active" : ""}`} />}
          </div>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="ha-onboarding-content">
        {step === "connect" && (
          <OnboardingConnect onStepComplete={() => onStepComplete("connect")} />
        )}
        {step === "configure" && (
          <OnboardingConfigure onStepComplete={() => onStepComplete("configure")} />
        )}
        {step === "verify" && (
          <OnboardingVerify onComplete={onComplete} />
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <div className="ha-onboarding-nav">
        {currentIndex > 0 && (
          <button className="ha-onboarding-btn ha-onboarding-btn--secondary" onClick={handlePrev}>
            <IconArrowLeft size={16} />
            Back
          </button>
        )}
        <div className="ha-onboarding-btn-spacer" />
        {step !== "verify" ? (
          <button className="ha-onboarding-btn ha-onboarding-btn--primary" onClick={handleNext} disabled={loading}>
            {loading ? <IconLoader className="ha-spinner" size={16} /> : "Next"}
          </button>
        ) : (
          <button className="ha-onboarding-btn ha-onboarding-btn--primary" onClick={handleNext}>
            <IconCheck size={16} />
            Launch App
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 1: Connect ──────────────────────────────────────────────────────

interface OnboardingConnectProps {
  onStepComplete: () => void;
}

function OnboardingConnect({ onStepComplete }: OnboardingConnectProps) {
  const [status, setStatus] = useState<"idle" | "starting" | "ready">("starting");

  useEffect(() => {
    const t = setTimeout(() => {
      setStatus("ready");
      onStepComplete();
    }, 1500);
    return () => clearTimeout(t);
  }, [onStepComplete]);

  return (
    <div className="ha-onboarding-step-content">
      <h3 className="ha-onboarding-title">Step 1: MCP Server Running</h3>
      <p className="ha-onboarding-desc">
        The MCP server is starting on port 3615. Claude Code will connect to this server to push surfaces.
      </p>
      <div className={`ha-onboarding-status ${status === "ready" ? "ready" : ""}`}>
        {status === "ready" ? (
          <>
            <span className="ha-onboarding-status-dot ready" />
            <span>Port 3615 — Active</span>
          </>
        ) : (
          <>
            <IconLoader className="ha-spinner" size={16} />
            <span>Starting…</span>
          </>
        )}
      </div>
      <div className="ha-onboarding-code">
        <code>curl http://localhost:3615/health</code>
      </div>
    </div>
  );
}

// ── Step 2: Configure ────────────────────────────────────────────────────

interface OnboardingConfigureProps {
  onStepComplete: () => void;
}

function OnboardingConfigure({ onStepComplete }: OnboardingConfigureProps) {
  return (
    <div className="ha-onboarding-step-content">
      <h3 className="ha-onboarding-title">Step 2: Claude Code Configuration</h3>
      <p className="ha-onboarding-desc">
        Add the following to your Claude Code configuration to enable Human Assist:
      </p>
      <div className="ha-onboarding-code">
        <code>echo 'export HUMAN_ASSIST_URL=http://localhost:3615' {'>>'} ~/.bashrc</code>
      </div>
      <p className="ha-onboarding-desc-small">
        Run this in your terminal. Then restart Claude Code.
      </p>
    </div>
  );
}

// ── Step 3: Verify ───────────────────────────────────────────────────────

interface OnboardingVerifyProps {
  onComplete: () => void;
}

function OnboardingVerify({ onComplete }: OnboardingVerifyProps) {
  return (
    <div className="ha-onboarding-step-content">
      <h3 className="ha-onboarding-title">Step 3: Verify Connection</h3>
      <p className="ha-onboarding-desc">
        All systems are operational. Claude Code can now push surfaces to Human Assist.
      </p>
      <div className="ha-onboarding-checklist">
        <div className="ha-onboarding-check">
          <IconCheck size={16} className="ha-onboarding-check-icon" />
          <span>MCP server running</span>
        </div>
        <div className="ha-onboarding-check">
          <IconCheck size={16} className="ha-onboarding-check-icon" />
          <span>Claude Code configured</span>
        </div>
        <div className="ha-onboarding-check">
          <IconCheck size={16} className="ha-onboarding-check-icon" />
          <span>WebSocket connected</span>
        </div>
        <div className="ha-onboarding-check">
          <IconCheck size={16} className="ha-onboarding-check-icon" />
          <span>Surfaces rendering</span>
        </div>
      </div>
    </div>
  );
}

export { OnboardingWizard, OnboardingConnect, OnboardingConfigure, OnboardingVerify };
