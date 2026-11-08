/** Per-host agent throttle (browser-throttle.ts).

The point of the defaults is a specific asymmetry: invisible to a person,
obvious to a bot. These tests pin that behaviour — burst first, then pacing, a
hard stop rather than an infinite hang, and an automatic cooldown once a site
pushes back (which is how we got IP-blocked in the first place).
*/

import { describe, it, expect, beforeAll, afterEach } from "vitest";

import {
  acquire,
  DEFAULT_POLICY,
  forgive,
  hostOf,
  isLocalHost,
  penalize,
  resetHosts,
  resetPolicy,
  setPolicy,
  snapshot,
} from "@/browser-throttle";

// Real timers, but tiny intervals: the pacing must be observable in wall time.
beforeAll(() => {
  resetPolicy();
  resetHosts();
});

afterEach(() => {
  resetHosts();
  resetPolicy();
});

describe("hostOf", () => {
  it("takes the hostname of http(s) urls and ignores everything else", () => {
    expect(hostOf("https://www.gaswork.com/jobs?x=1")).toBe("www.gaswork.com");
    expect(hostOf("http://localhost:3000")).toBe("localhost");
    expect(hostOf("file:///etc/passwd")).toBeNull();
    expect(hostOf("not a url")).toBeNull();
    expect(hostOf(undefined)).toBeNull();
  });
});

describe("pacing", () => {
  it("lets a burst through, then paces sustained loads per host", async () => {
    setPolicy({ minIntervalMs: 60, burst: 2, maxWaitMs: 2000, penaltyMs: 0 });
    const a = await acquire("https://a.test/1");
    const b = await acquire("https://a.test/2");
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);

    const t0 = Date.now();
    const c = await acquire("https://a.test/3");
    const dt = Date.now() - t0;
    expect(c.allowed).toBe(true);
    // Third load had to wait for a token instead of firing immediately.
    expect(dt).toBeGreaterThanOrEqual(25);
  });

  it("tracks hosts independently", async () => {
    setPolicy({ minIntervalMs: 200, burst: 1, maxWaitMs: 2000, penaltyMs: 0 });
    await acquire("https://a.test/");
    const t0 = Date.now();
    const other = await acquire("https://b.test/");
    expect(other.allowed).toBe(true);
    expect(Date.now() - t0).toBeLessThan(120); // b.test had its own bucket
  });

  it("reports rate_limited instead of hanging forever when the wait is capped", async () => {
    setPolicy({ minIntervalMs: 60_000, burst: 1, maxWaitMs: 60, penaltyMs: 0 });
    expect((await acquire("https://slow.test/")).allowed).toBe(true);
    const res = await acquire("https://slow.test/");
    expect(res.allowed).toBe(false);
    expect(res.limited).toBe(true);
    expect(res.reason ?? "").toMatch(/paced/);
  });

  it("accepts a bare hostname as well as a url", async () => {
    setPolicy({ minIntervalMs: 0, burst: 50, maxWaitMs: 0, penaltyMs: 0 });
    expect((await acquire("gaswork.com")).allowed).toBe(true);
  });
});

describe("penalty after a site pushes back", () => {
  it("cools the host down and forgives on request", async () => {
    setPolicy({ minIntervalMs: 0, burst: 5, maxWaitMs: 30, penaltyMs: 5000 });
    penalize("https://gaswork.com/jobs", "botWall: you have been blocked");

    const res = await acquire("https://gaswork.com/jobs");
    expect(res.allowed).toBe(false);
    expect(res.reason ?? "").toMatch(/cooling down gaswork.com/);
    expect(res.reason ?? "").toMatch(/botWall/);

    expect(forgive("gaswork.com")).toBe(true);
    expect((await acquire("https://gaswork.com/jobs")).allowed).toBe(true);
    expect(forgive("never-seen.test")).toBe(false);
  });
});

describe("policy", () => {
  it("clamps nonsense into usable bounds", () => {
    const p = setPolicy({ minIntervalMs: 10_000_000, burst: -4, maxWaitMs: -1, penaltyMs: 99e9 });
    expect(p.minIntervalMs).toBe(60_000);
    expect(p.burst).toBe(1);
    expect(p.maxWaitMs).toBe(0);
    expect(p.penaltyMs).toBe(15 * 60_000);
  });

  it("defaults are human-invisible and bot-slow", () => {
    expect(DEFAULT_POLICY.minIntervalMs).toBeGreaterThanOrEqual(800);
    expect(DEFAULT_POLICY.minIntervalMs).toBeLessThanOrEqual(2500);
    expect(DEFAULT_POLICY.burst).toBeGreaterThanOrEqual(3);
    expect(DEFAULT_POLICY.burst).toBeLessThanOrEqual(8);
  });

  it("snapshot exposes policy and per-host state", async () => {
    setPolicy({ minIntervalMs: 0, burst: 3, maxWaitMs: 0, penaltyMs: 0 });
    await acquire("https://counted.test/");
    const s = snapshot();
    expect(s.policy).toBeDefined();
    expect(s.hosts.find((h) => h.host === "counted.test")?.hits).toBe(1);
  });
});

describe("loopback is never paced or penalized", () => {
  it("recognises our own addresses", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("LOCALHOST")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("::1")).toBe(true);
    expect(isLocalHost("[::1]")).toBe(true);
    expect(isLocalHost("dev.local")).toBe(true);
    expect(isLocalHost("gaswork.com")).toBe(false);
    expect(isLocalHost("notlocalhost.com")).toBe(false);
  });

  it("hands a loopback token instantly and records no penalty", async () => {
    setPolicy({ penaltyMs: 30_000 });
    penalize("http://127.0.0.1:3615/mcp", "404 from a tools/list probe");
    const t0 = Date.now();
    const res = await acquire("http://127.0.0.1:3615/mcp");
    expect(res.allowed).toBe(true);
    expect(res.waitedMs).toBe(0);
    expect(Date.now() - t0).toBeLessThan(250);
    // Nothing was recorded for that host, so later calls are not stuck either.
    expect(snapshot().hosts.some((h) => h.host === "127.0.0.1")).toBe(false);
    resetPolicy();
  });

  it("still penalizes a real host that pushed back", () => {
    setPolicy({ penaltyMs: 30_000 });
    penalize("https://gaswork.com/robots.txt", "challenge page");
    const row = snapshot().hosts.find((h) => h.host === "gaswork.com");
    expect(row).toBeDefined();
    expect(row!.penaltyRemainingMs).toBeGreaterThan(0);
    expect(row!.penaltyReason).toContain("challenge page");
    resetPolicy();
  });
});
