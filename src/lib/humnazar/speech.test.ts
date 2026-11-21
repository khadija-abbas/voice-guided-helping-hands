import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Chrome-like recognizer: one session at a time; onend arrives asynchronously after a result or abort().
let instances = 0;
let active: MockRec | null = null;
let live: MockRec | null = null;
class MockRec {
  lang = ""; continuous = true; interimResults = true; maxAlternatives = 1;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() { instances++; }
  start() {
    if (active) throw new DOMException("already started", "InvalidStateError");
    active = this; live = this;
  }
  private end() { setTimeout(() => { if (active === this) active = null; this.onend?.(); }, 100); }
  hear(text: string) {
    live = null;
    const alt = [{ transcript: text }];
    this.onresult?.({ results: [alt] });
    this.end();
  }
  fail(code: string) { live = null; this.onerror?.({ error: code }); this.end(); }
  abort() { if (live === this) { live = null; this.onerror?.({ error: "aborted" }); this.end(); } }
}

async function whenLive(): Promise<MockRec> {
  for (let i = 0; i < 200 && !live; i++) await new Promise((r) => setTimeout(r, 10));
  if (!live) throw new Error("never listened");
  return live;
}

let sp: typeof import("./speech");
beforeEach(async () => {
  instances = 0; active = null; live = null;
  vi.resetModules();
  (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = MockRec;
  sp = await import("./speech");
});
afterEach(() => sp.stopListening());

describe("shared voice controller", () => {
  it("speech safety timer is 400 ms per word plus 1 second", () => {
    expect(sp.speechSafetyMs("Say confirm or cancel")).toBe(4 * 400 + 1000);
    expect(sp.speechSafetyMs("")).toBe(1000);
  });

  it("listens again right after a result, on the same recognizer, without failing", async () => {
    const first = sp.listen("en", 3000);
    (await whenLive()).hear("friend");
    expect(await first).toMatchObject({ status: "ok", text: "friend" });
    // The previous session is still ending: the controller must wait instead of failing.
    const second = sp.listen("en", 3000);
    (await whenLive()).hear("confirm");
    expect(await second).toMatchObject({ status: "ok", text: "confirm" });
    expect(instances).toBe(1);
  });

  it("uses ur-PK in Urdu and en-US otherwise, with one result and 3 alternatives", async () => {
    const p = sp.listen("ur", 3000);
    const r = await whenLive();
    expect(r.lang).toBe("ur-PK");
    expect(r.continuous).toBe(false);
    expect(r.interimResults).toBe(false);
    expect(r.maxAlternatives).toBe(3);
    r.hear("دوست");
    await p;
  });

  it("ignores a result that arrives after the screen changed", async () => {
    sp.openScreen();
    const p = sp.listen("en", 3000);
    const r = await whenLive();
    sp.openScreen();
    r.hear("friend");
    expect(await p).toEqual({ status: "aborted" });
  });

  it("no-speech is a retryable miss, not-allowed means the microphone is blocked", async () => {
    const a = sp.listen("en", 3000);
    (await whenLive()).fail("no-speech");
    expect(await a).toMatchObject({ status: "nomatch", code: "no-speech" });
    const b = sp.listen("en", 3000);
    (await whenLive()).fail("not-allowed");
    expect(await b).toMatchObject({ status: "blocked", code: "not-allowed" });
  });
});
