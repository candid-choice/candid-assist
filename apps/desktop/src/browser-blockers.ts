/** Human-required-blocker detection for the embedded browser engine.
 *
 *  The agent can click, type and read — but some gates are DESIGNED to be
 *  unwinnable by automation (CAPTCHA, MFA on the human's phone, a mailbox it
 *  cannot open), and some are the human's decision to make, not the agent's
 *  (which account, accept-cookies, pay a paywall). Those must stop the run and
 *  go to the person.
 *
 *  Split for testability: `BLOCKER_FACTS_JS` runs in the page and returns raw
 *  facts only; `classifyBlockers` is a pure Node function over those facts, so
 *  the rules are unit-testable without an Electron guest.
 */

export type BlockerKind =
  | "captcha"
  | "botWall"
  | "login"
  | "mfa"
  | "magicLink"
  | "humanVerify"
  | "passkey"
  | "accountChooser"
  | "consent"
  | "paywall"
  | "kyc";

export interface Blocker {
  kind: BlockerKind;
  /** hard = the human must act (handoff). soft = the human must DECIDE
   *  (answer an input surface) — automation may continue otherwise. */
  severity: "hard" | "soft";
  confidence: number;
  evidence: string[];
  /** What the agent should do next. */
  suggest: "handoff" | "input" | "continue";
  /** Ready-to-show instruction for the human ("Your turn" pane). */
  prompt: string;
}

/** Raw in-page observations (see BLOCKER_FACTS_JS). */
export interface BlockerFacts {
  url?: string;
  title?: string;
  /** body innerText, lowercased, capped */
  text?: string;
  hasPasswordInput?: boolean;
  /** inputs that look like one-time-code fields */
  otpInputs?: { name: string; id: string; autocomplete: string; maxlength: number }[];
  /** iframe src list (challenge widgets live in frames) */
  iframes?: string[];
  /** visible button/label/link texts, lowercased */
  visibleTexts?: string[];
  /** named selector hits */
  selectors?: Record<string, boolean>;
  /** rows in an account chooser ("Choose an account") */
  accountRows?: number;
  /** WebAuthn/passkey affordances */
  passkeyAffordance?: boolean;
  /** <base>/document.title hints */
  metaDescription?: string;
}

const T = (f: BlockerFacts): string =>
  `${f.title ?? ""} ${f.url ?? ""} ${f.text ?? ""}`.toLowerCase();

interface Rule {
  kind: BlockerKind;
  severity: "hard" | "soft";
  /** keyword phrases whose presence (in body text or a visible control) scores */
  phrases: string[];
  /** selector keys (see BLOCKER_FACTS_JS) whose presence scores */
  selectorKeys?: string[];
  /** regex over the whole text; each match scores */
  re?: RegExp;
  min: number;
  suggest: "handoff" | "input" | "continue";
  prompt: string;
}

const RULES: Rule[] = [
  {
    kind: "captcha",
    severity: "hard",
    phrases: [
      "recaptcha",
      "hcaptcha",
      "i'm not a robot",
      "confirm you are not a robot",
      "prove you are human",
      "puzzle",
    ],
    selectorKeys: ["recaptcha", "turnstile", "hcaptcha", "captchaInput", "challengeFrame"],
    re: /complete the security check|verify you are human|are you a robot/i,
    min: 1,
    suggest: "handoff",
    prompt: "Solve the CAPTCHA / human check, then click Done.",
  },
  {
    kind: "botWall",
    severity: "hard",
    phrases: [
      "unusual traffic",
      "access denied",
      "blocked",
      "enable javascript and cookies",
      "waiting for www.",
      "checking your browser",
      "pardon our interruption",
      "request blocked",
      "error 1020",
      "attention required",
    ],
    selectorKeys: ["cfChallenge", "challengeFrame"],
    re: /too many requests|rate limit|429|temporarily blocked/i,
    min: 1,
    suggest: "handoff",
    prompt:
      "This page is blocking automation. Load it in your own session (or wait out the rate limit), then click Done.",
  },
  {
    kind: "mfa",
    severity: "hard",
    phrases: [
      "verification code",
      "authentication code",
      "one-time code",
      "enter the code",
      "authenticator app",
      "two-factor",
      "2-step verification",
      "security code",
      "mfa",
      "otp",
    ],
    selectorKeys: ["otpInput"],
    re: /code from your (authenticator|app|phone)|sent to your (phone|email)|enter the \d{4,6}-digit/i,
    min: 1,
    suggest: "handoff",
    prompt: "Enter your 2FA / one-time code (it comes from your authenticator, phone or email).",
  },
  {
    kind: "magicLink",
    severity: "hard",
    phrases: [
      "check your email",
      "we sent you an email",
      "we've sent a link",
      "click the link in your email",
      "check your inbox",
      "sent a code to your email",
    ],
    min: 1,
    suggest: "handoff",
    prompt: "Open the email we were sent and follow the link / code, then click Done.",
  },
  {
    kind: "passkey",
    severity: "hard",
    phrases: ["use your passkey", "face id", "touch id", "windows hello", "security key"],
    selectorKeys: ["passkeyButton"],
    min: 1,
    suggest: "handoff",
    prompt: "Approve with your passkey / security key (biometrics or hardware — only you can).",
  },
  {
    kind: "login",
    severity: "hard",
    phrases: ["sign in", "log in", "log in to continue", "sign in to continue", "password"],
    selectorKeys: ["passwordInput", "loginForm"],
    re: /(?:sign|log)\s?in (?:to|with) /i,
    min: 1,
    suggest: "handoff",
    prompt: "Sign in — your credentials are yours; the agent must not handle them.",
  },
  {
    kind: "humanVerify",
    severity: "hard",
    phrases: [
      "are you a human",
      "are you a real person",
      "confirm you're a real person",
      "human verification",
      "not a bot",
      "i am a human",
    ],
    min: 1,
    suggest: "handoff",
    prompt: "Confirm you're human, then click Done.",
  },
  {
    kind: "kyc",
    severity: "hard",
    phrases: [
      "verify your identity",
      "upload a photo of your id",
      "government-issued id",
      "proof of address",
      "selfie with your id",
      "identity verification",
    ],
    min: 1,
    suggest: "handoff",
    prompt: "Identity verification needs your documents and your face — please complete it.",
  },
  {
    kind: "accountChooser",
    severity: "soft",
    phrases: ["choose an account", "pick an account", "select account", "use another account"],
    min: 1,
    suggest: "input",
    prompt: "Which account should I use?",
  },
  {
    kind: "consent",
    severity: "soft",
    phrases: [
      "accept all",
      "accept cookies",
      "cookie policy",
      "we use cookies",
      "manage preferences",
      "consent",
      "only necessary",
    ],
    selectorKeys: ["consentBanner"],
    min: 1,
    suggest: "input",
    prompt: "Cookie/consent wall — accept all, only necessary, or skip this site?",
  },
  {
    kind: "paywall",
    severity: "soft",
    phrases: [
      "subscribe to continue",
      "subscribe to read",
      "start free trial",
      "paywall",
      "create an account to continue",
      "register to continue",
      "members only",
      "premium content",
    ],
    min: 1,
    suggest: "input",
    prompt: "Paywall — pay/subscribe, sign up, or skip this source?",
  },
];

const has = (hay: string, p: string): boolean => hay.includes(p.toLowerCase());

/** Pure classifier: raw in-page facts → ordered blockers (most severe first). */
export function classifyBlockers(facts: BlockerFacts): Blocker[] {
  const hay = T(facts);
  const texts = (facts.visibleTexts ?? []).map((t) => t.toLowerCase());
  const out: Blocker[] = [];

  for (const r of RULES) {
    const evidence: string[] = [];
    let score = 0;

    for (const p of r.phrases) {
      if (has(hay, p)) {
        score += 1;
        evidence.push(`text: "${p}"`);
      } else if (texts.some((t) => has(t, p))) {
        score += 1.25; // a visible control is stronger evidence than prose
        evidence.push(`control: "${p}"`);
      }
    }
    for (const k of r.selectorKeys ?? []) {
      if (facts.selectors?.[k]) {
        score += 1.5;
        evidence.push(`selector: ${k}`);
      }
    }
    if (r.re) {
      const m = r.re.exec(facts.text ?? "");
      if (m) {
        score += 1;
        evidence.push(`pattern: ${m[0].slice(0, 60)}`);
      }
    }
    // Structural boosters per kind.
    if (r.kind === "mfa" && (facts.otpInputs?.length ?? 0) > 0) {
      score += 1.5;
      evidence.push(`otp inputs: ${facts.otpInputs?.[0]?.autocomplete || "code field"}`);
    }
    if (r.kind === "login" && facts.hasPasswordInput) {
      score += 1.5;
      evidence.push("password input");
    }
    if (r.kind === "accountChooser" && (facts.accountRows ?? 0) > 1) {
      score += 1.5;
      evidence.push(`account rows: ${facts.accountRows}`);
    }
    if (
      (r.kind === "captcha" || r.kind === "botWall") &&
      (facts.iframes ?? []).some((s) =>
        /recaptcha|challenges\.cloudflare|hcaptcha|turnstile/i.test(s),
      )
    ) {
      score += 2;
      evidence.push("challenge iframe");
    }
    if (r.kind === "passkey" && facts.passkeyAffordance) {
      score += 1.5;
      evidence.push("passkey affordance");
    }

    if (score < r.min) continue;
    out.push({
      kind: r.kind,
      severity: r.severity,
      confidence: Math.min(1, Math.round((score / 3) * 100) / 100),
      evidence: evidence.slice(0, 6),
      suggest: r.suggest,
      prompt: r.prompt,
    });
  }

  // A login wall that is really just an MFA step is an MFA problem, and a CAPTCHA
  // inside a login page is a CAPTCHA problem: keep the more specific one first.
  const rank = { hard: 0, soft: 1 } as const;
  const specificity: Record<string, number> = {
    captcha: 0,
    botWall: 1,
    mfa: 2,
    magicLink: 3,
    passkey: 4,
    humanVerify: 5,
    kyc: 6,
    login: 7,
    accountChooser: 8,
    consent: 9,
    paywall: 10,
  };
  const deduped: Blocker[] = [];
  for (const b of out.filter((b) => !(b.kind === "login" && out.some((o) => o.kind === "mfa")))) {
    deduped.push(b);
  }
  return deduped.sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      (specificity[a.kind] ?? 99) - (specificity[b.kind] ?? 99) ||
      b.confidence - a.confidence,
  );
}

export function hardBlockers(blockers: Blocker[]): Blocker[] {
  return blockers.filter((b) => b.severity === "hard");
}

/** The single instruction to show the human, from the dominant blocker. */
export function handoffPrompt(blockers: Blocker[], fallback = "Your turn"): string {
  const top = blockers[0];
  return top ? `${top.kind}: ${top.prompt}` : fallback;
}

/** Captcha-ish only — kept for the legacy `captchaDetected` field. */
export function captchaLike(blockers: Blocker[]): boolean {
  return blockers.some(
    (b) => b.kind === "captcha" || b.kind === "botWall" || b.kind === "humanVerify",
  );
}

/** In-page fact collector. Returns a JSON string of BlockerFacts. */
export const BLOCKER_FACTS_JS = `(() => {
  const low = (s) => String(s || '').toLowerCase();
  const text = low(document.body ? (document.body.innerText || '') : '').slice(0, 4000);
  const q = (sel) => { try { return !!document.querySelector(sel); } catch (e) { return false; } };
  const selectors = {
    recaptcha: q('[class*="recaptcha" i],[id*="recaptcha" i],iframe[src*="recaptcha"],.g-recaptcha'),
    turnstile: q('[class*="cf-turnstile" i],[id*="cf-turnstile" i],iframe[src*="challenges.cloudflare"]'),
    hcaptcha: q('[class*="hcaptcha" i],[id*="hcaptcha" i],iframe[src*="hcaptcha"]'),
    captchaInput: q('[name*="captcha" i],[id*="captcha" i],[class*="captcha" i]'),
    challengeFrame: q('iframe[src*="challenges.cloudflare"],iframe[title*="challenge" i],iframe[src*="recaptcha"]'),
    cfChallenge: q('#challenge-running,.cf-browser-verification,#cf-chl-widget'),
    passwordInput: q('input[type="password"]'),
    loginForm: q('form[action*="login" i],form[action*="signin" i],#loginform,[data-testid="login-form"]'),
    otpInput: q('input[name*="otp" i],input[name*="code" i],input[id*="otp" i],input[id*="code" i],input[autocomplete="one-time-code"],input[inputmode="numeric"][maxlength="6"]'),
    consentBanner: q('#onetrust-consent-sdk,[id*="cookie" i][class*="banner" i],[class*="cookie-consent" i],[aria-label*="cookie" i],[data-testid*="consent" i]'),
    passkeyButton: q('[data-testid*="passkey" i],[aria-label*="passkey" i],button:is([class*="passkey" i])'),
  };
  const otpInputs = [...document.querySelectorAll('input[name*="otp" i],input[name*="code" i],input[id*="otp" i],input[autocomplete="one-time-code"],input[inputmode="numeric"][maxlength]')]
    .slice(0, 6)
    .map((e) => ({
      name: e.getAttribute('name') || '',
      id: e.id || '',
      autocomplete: e.getAttribute('autocomplete') || '',
      maxlength: parseInt(e.getAttribute('maxlength') || '0', 10) || 0,
    }));
  const iframes = [...document.querySelectorAll('iframe')].slice(0, 20).map((f) => f.src || '');
  const visibleTexts = [...document.querySelectorAll('button,a,label,summary,[role=button],input[type=submit],h1,h2')]
    .slice(0, 80)
    .map((e) => low((e.innerText || '') || (e.value || '') || e.getAttribute('aria-label') || ''))
    .filter((s) => s.length > 0 && s.length < 120);
  const accountRows = [...document.querySelectorAll('[data-auth-identifier],.account-item,[role=option],li[role=menuitem]')]
    .filter((e) => /@/.test(e.innerText || '')).length;
  const passkeyAffordance =
    typeof window.PublicKeyCredential === 'function' &&
    visibleTexts.some((t) => /passkey|face id|touch id|security key/.test(t));
  const meta = document.querySelector('meta[name="description"]');
  return JSON.stringify({
    url: location.href,
    title: document.title,
    text,
    hasPasswordInput: selectors.passwordInput,
    otpInputs,
    iframes,
    visibleTexts,
    selectors,
    accountRows,
    passkeyAffordance,
    metaDescription: meta ? String(meta.getAttribute('content') || '').slice(0, 200) : '',
  });
})()`;
