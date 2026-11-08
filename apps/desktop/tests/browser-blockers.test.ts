/** Unit tests for the human-required-blocker classifier (the pure Node half —
 *  the in-page half is BLOCKER_FACTS_JS, exercised through the browser e2e
 *  paths). `classifyBlockers` takes raw facts and returns Blocker[]; helpers
 *  here assert over the RESULT, not the facts. */

import { describe, expect, it } from "vitest";
import {
  captchaLike,
  classifyBlockers,
  handoffPrompt,
  hardBlockers,
  type Blocker,
  type BlockerFacts,
} from "../src/browser-blockers";

/** A page with no gates at all. */
const clean: BlockerFacts = {
  url: "https://acme.dev/pricing",
  title: "Pricing · Acme",
  text: "plans for teams and enterprise. contact sales for volume discounts.",
  visibleTexts: ["docs", "pricing", "contact sales"],
  selectors: {},
  iframes: [],
  otpInputs: [],
  accountRows: 0,
};

const kindsOf = (result: Blocker[]): string[] => result.map((b) => b.kind);
const kindsFrom = (f: BlockerFacts): string[] => kindsOf(classifyBlockers(f));

describe("classifyBlockers", () => {
  it("returns nothing for an ordinary page", () => {
    expect(classifyBlockers(clean)).toEqual([]);
    expect(hardBlockers(classifyBlockers(clean))).toEqual([]);
    expect(captchaLike(classifyBlockers(clean))).toBe(false);
  });

  it("detects a reCAPTCHA from the widget + challenge iframe", () => {
    const b = classifyBlockers({
      ...clean,
      url: "https://acme.dev/login",
      text: "to continue, complete the security check",
      selectors: { recaptcha: true },
      iframes: ["https://www.google.com/recaptcha/api2/anchor"],
      visibleTexts: ["i'm not a robot"],
    });
    expect(kindsOf(b)).toContain("captcha");
    expect(b[0].kind).toBe("captcha");
    expect(b[0].severity).toBe("hard");
    expect(b[0].suggest).toBe("handoff");
    expect(b[0].confidence).toBeGreaterThan(0.5);
    expect(b[0].evidence.length).toBeGreaterThan(0);
    expect(captchaLike(b)).toBe(true);
  });

  it("treats a Cloudflare 'unusual traffic' wall as a hard bot wall", () => {
    const b = classifyBlockers({
      ...clean,
      title: "Attention Required! | Cloudflare",
      text: "why have I been blocked? this request has been blocked because of unusual traffic",
      selectors: { cfChallenge: true },
    });
    expect(kindsOf(b)).toContain("botWall");
    expect(hardBlockers(b).map((x) => x.kind)).toContain("botWall");
  });

  it("prefers MFA over the generic login wall when a one-time-code field is present", () => {
    const b = classifyBlockers({
      ...clean,
      url: "https://acme.dev/verify",
      title: "Verify it's you",
      text: "enter the code from your authenticator app to finish signing in",
      selectors: { otpInput: true },
      otpInputs: [{ name: "otp", id: "code", autocomplete: "one-time-code", maxlength: 6 }],
      visibleTexts: ["verify", "use a different method"],
    });
    expect(kindsOf(b)[0]).toBe("mfa");
    expect(b.find((x) => x.kind === "mfa")?.severity).toBe("hard");
  });

  it("flags a credentials form as a hard login wall", () => {
    const b = classifyBlockers({
      ...clean,
      url: "https://acme.dev/sign-in",
      text: "sign in to continue with your work account",
      hasPasswordInput: true,
      selectors: { passwordInput: true, loginForm: true },
      visibleTexts: ["sign in"],
    });
    expect(kindsOf(b)).toContain("login");
    expect(hardBlockers(b).map((x) => x.kind)).toContain("login");
  });

  it("treats a mailbox step as hard (the agent cannot open the human's email)", () => {
    const b = classifyBlockers({
      ...clean,
      text: "we sent you an email — check your inbox for the link",
    });
    expect(kindsOf(b)).toContain("magicLink");
    expect(b.find((x) => x.kind === "magicLink")?.severity).toBe("hard");
  });

  it("passes a passkey prompt to the human (biometrics are not automatable)", () => {
    const b = classifyBlockers({
      ...clean,
      text: "use your passkey to sign in",
      visibleTexts: ["use your passkey", "touch id"],
      selectors: { passkeyButton: true },
      passkeyAffordance: true,
    });
    expect(kindsOf(b)).toContain("passkey");
    expect(hardBlockers(b).map((x) => x.kind)).toContain("passkey");
  });

  it("makes an account chooser a DECISION (soft), not a handoff", () => {
    const b = classifyBlockers({
      ...clean,
      url: "https://accounts.google.com/signin/chooser",
      text: "choose an account to continue to candid",
      accountRows: 3,
      visibleTexts: ["shan@candidchoice.ai", "dev@candidchoice.ai", "use another account"],
    });
    const ac = b.find((x) => x.kind === "accountChooser");
    expect(ac?.severity).toBe("soft");
    expect(ac?.suggest).toBe("input");
    // Soft blockers must never trip an automation stop.
    expect(hardBlockers(b).map((x) => x.kind)).not.toContain("accountChooser");
  });

  it("keeps cookie consent and paywalls as soft decisions", () => {
    const consent = classifyBlockers({
      ...clean,
      text: "we use cookies to improve your experience",
      selectors: { consentBanner: true },
      visibleTexts: ["accept all", "only necessary"],
    });
    expect(consent[0].kind).toBe("consent");
    expect(consent[0].suggest).toBe("input");
    expect(hardBlockers(consent)).toEqual([]);

    const pay = classifyBlockers({
      ...clean,
      text: "subscribe to read the rest of this article. members only.",
      visibleTexts: ["subscribe to continue"],
    });
    expect(kindsOf(pay)).toContain("paywall");
    expect(hardBlockers(pay)).toEqual([]);
  });

  it("orders hard blockers before soft ones", () => {
    const b = classifyBlockers({
      ...clean,
      text: "we use cookies — but first verify you are human to continue",
      selectors: { consentBanner: true, captchaInput: true },
      visibleTexts: ["accept all", "i'm not a robot"],
    });
    expect(b[0].severity).toBe("hard");
    const lastHard = b.map((x) => x.severity).lastIndexOf("hard");
    const firstSoft = b.map((x) => x.severity).indexOf("soft");
    expect(firstSoft === -1 || lastHard < firstSoft).toBe(true);
  });

  it("renders a human-readable handoff prompt", () => {
    const b = classifyBlockers({
      ...clean,
      text: "enter the code from your authenticator app",
    });
    expect(handoffPrompt(b)).toMatch(/^mfa: /);
    expect(handoffPrompt([])).toBe("Your turn");
  });
});
