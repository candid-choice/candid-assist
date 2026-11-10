/** A denied capture is not one failure but three, and the agent has to know
 *  which one it hit: retrying a prompt that is waiting on someone's screen is
 *  polite, retrying a human's "no" is not, and neither applies when nobody was
 *  ever asked because no window was connected. */

import { describe, it, expect } from "vitest";
import { consentGuidance } from "../src/mcp-server.js";

describe("consentGuidance", () => {
  it("timeout: the prompt is on a screen somewhere, so say so", () => {
    const g = consentGuidance("timeout", "display 1");
    expect(g.hint).toMatch(/sitting on the human's screen/);
    expect(g.hint).toContain("display 1");
    expect(g.nextStep).toMatch(/click Allow/i);
    expect(g.nextStep).toMatch(/do not retry blindly/i);
  });

  it("no-ui: nobody was asked, so 'ask again' would be nonsense", () => {
    const g = consentGuidance("no-ui", "window: Slack");
    expect(g.hint).toMatch(/Nobody was asked/);
    expect(g.hint).toContain("window: Slack");
    expect(g.nextStep).toMatch(/Open the Human Assist app/);
  });

  it("an explicit deny tells the agent to stop, not to wait", () => {
    const g = consentGuidance("deny", "window: Messages");
    expect(g.hint).toMatch(/declined/);
    expect(g.nextStep).toMatch(/Do not retry this target/);
    expect(g.nextStep).not.toMatch(/Allow/);
  });

  it("never overstates what happened, whatever the decision string", () => {
    for (const d of ["timeout", "no-ui", "deny", "something_unexpected"]) {
      const g = consentGuidance(d, "screen");
      expect(g.hint.toLowerCase()).not.toMatch(/saved|captured to|wrote/);
      expect(g.hint.length).toBeGreaterThan(20);
      expect(g.nextStep.length).toBeGreaterThan(20);
    }
  });
});
