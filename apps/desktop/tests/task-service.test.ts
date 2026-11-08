/** task-service — internal-model planner unit tests (fetch stubbed). */
import { describe, it, expect } from "vitest";
import { planGoal, PLAN_DEFAULT_BASE_URL } from "../src/task-service";

function fetchStub(routes: Record<string, () => unknown>) {
  return (async (url: string, init?: RequestInit) => {
    const key = Object.keys(routes).find((k) => String(url).endsWith(k));
    if (!key) throw new Error("unexpected fetch: " + url);
    const payload = routes[key]();
    void init;
    return {
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => "",
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

const planPayload = (summary: string, actions: unknown[]) => ({
  choices: [{ message: { content: JSON.stringify({ summary, actions }) } }],
});

describe("planGoal", () => {
  it("asks /models then plans via chat/completions (fenced JSON tolerated)", async () => {
    const calls: string[] = [];
    const doFetch = (async (url: string, init?: RequestInit) => {
      calls.push(String(url));
      if (String(url).endsWith("/models")) {
        return {
          ok: true,
          json: async () => ({ data: [{ id: "qwen-planner" }] }),
        } as unknown as Response;
      }
      expect(JSON.parse(String(init?.body)).model).toBe("qwen-planner");
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  '```json\n{"summary":"open gaswork","actions":[{"action":"navigate","url":"https://www.gaswork.com/"}]}\n```',
              },
            },
          ],
        }),
      } as unknown as Response;
    }) as unknown as typeof fetch;
    const plan = await planGoal("find locum anesthesia jobs on gaswork.com", {
      fetchImpl: doFetch,
    });
    expect(calls[0]).toContain("/models");
    expect(calls[1]).toContain("/chat/completions");
    expect(plan.summary).toBe("open gaswork");
    expect(plan.actions[0]).toEqual({ action: "navigate", url: "https://www.gaswork.com/" });
  });

  it("honors explicit modelId and baseUrl", async () => {
    let seenUrl = "";
    const plan = await planGoal("do the thing", {
      baseUrl: "http://model.local:9/v1/",
      modelId: "fixed-model",
      fetchImpl: (async (url: string, init?: RequestInit) => {
        seenUrl = String(url);
        expect(JSON.parse(String(init?.body)).model).toBe("fixed-model");
        return {
          ok: true,
          json: async () => planPayload("s", [{ action: "snapshot" }]),
        } as unknown as Response;
      }) as unknown as typeof fetch,
    });
    expect(seenUrl).toBe("http://model.local:9/v1/chat/completions");
    expect(plan.actions).toHaveLength(1);
  });

  it("uses the default internal endpoint when nothing is configured", async () => {
    let seenUrl = "";
    await planGoal("x", {
      modelId: "m",
      fetchImpl: (async (url: string) => {
        seenUrl = String(url);
        return {
          ok: true,
          json: async () => planPayload("s", [{ action: "snapshot" }]),
        } as unknown as Response;
      }) as unknown as typeof fetch,
    });
    expect(seenUrl.startsWith(PLAN_DEFAULT_BASE_URL)).toBe(true);
  });

  it("rejects unparseable planner output (PLAN_004)", async () => {
    await expect(
      planGoal("x", {
        modelId: "m",
        fetchImpl: fetchStub({
          "/chat/completions": () => ({
            choices: [{ message: { content: "I will click around!" } }],
          }),
        }),
      }),
    ).rejects.toThrow(/PLAN_004/);
  });

  it("rejects plans with no actions (PLAN_005)", async () => {
    await expect(
      planGoal("x", {
        modelId: "m",
        fetchImpl: fetchStub({ "/chat/completions": () => planPayload("nothing to do", []) }),
      }),
    ).rejects.toThrow(/PLAN_005/);
  });

  it("rejects empty goals and non-OK endpoints", async () => {
    await expect(planGoal("   ")).rejects.toThrow(/PLAN_001/);
    await expect(
      planGoal("x", {
        modelId: "m",
        fetchImpl: (async () => ({
          ok: false,
          status: 503,
          json: async () => ({}),
          text: async () => "down",
        })) as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/PLAN_002/);
  });
});
