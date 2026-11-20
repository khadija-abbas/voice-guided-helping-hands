// Browser speech helpers (Web Speech API). Only call from effects or event handlers.
import type { Lang } from "./logic";

const RATE = 0.9;
let speakToken = 0;

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

export function hasUrduVoice(): boolean {
  const s = synth();
  return !!s && s.getVoices().some((v) => v.lang.toLowerCase().startsWith("ur"));
}

export function cancelSpeech(): void {
  speakToken++;
  synth()?.cancel();
}

/** Speaks text; resolves true when it finished, false when it was cancelled or replaced. */
export function speak(text: string, lang: Lang): Promise<boolean> {
  const s = synth();
  cancelSpeech();
  const token = speakToken;
  if (!s || !text) return Promise.resolve(true);
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(safety);
      resolve(ok && token === speakToken);
    };
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "ur" ? "ur-PK" : "en-US";
    u.rate = RATE;
    const voice = s.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang === "ur" ? "ur" : "en"));
    if (voice) u.voice = voice;
    u.onend = () => finish(true);
    u.onerror = (e) => finish(e.error !== "interrupted" && e.error !== "canceled");
    // Some browsers never fire onend (no voices installed): fall back to an estimated duration.
    const safety = setTimeout(() => finish(true), 1500 + text.length * 90);
    try {
      s.speak(u);
    } catch {
      finish(true);
    }
  });
}

/* ---------- Recognition ---------- */

type Rec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export type ListenResult =
  | { status: "ok"; text: string; alternatives: string[] }
  | { status: "nomatch" }
  | { status: "aborted" }
  | { status: "unavailable" };

function recCtor(): (new () => Rec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionSupported(): boolean {
  return !!recCtor();
}

let current: { rec: Rec; settle: (r: ListenResult) => void } | null = null;

export function stopListening(): void {
  if (!current) return;
  const c = current;
  current = null;
  c.settle({ status: "aborted" });
  try {
    c.rec.abort();
  } catch {
    /* already stopped */
  }
}

/** Listens once for up to timeoutMs. Urdu app uses ur-PK, otherwise en-US. */
export function listen(lang: Lang, timeoutMs = 6000): Promise<ListenResult> {
  stopListening();
  const Ctor = recCtor();
  if (!Ctor) return Promise.resolve({ status: "unavailable" });
  return new Promise((resolve) => {
    let settled = false;
    const rec = new Ctor();
    const settle = (r: ListenResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (current?.rec === rec) current = null;
      resolve(r);
    };
    rec.lang = lang === "ur" ? "ur-PK" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.continuous = false;
    rec.onresult = (e) => {
      const first = e.results[0];
      const alts: string[] = [];
      if (first) for (let i = 0; i < first.length; i++) alts.push(first[i]?.transcript ?? "");
      settle({ status: "ok", text: alts[0] ?? "", alternatives: alts });
    };
    rec.onerror = (e) => {
      if (["not-allowed", "service-not-allowed", "audio-capture", "network", "language-not-supported"].includes(e.error)) settle({ status: "unavailable" });
      else if (e.error === "aborted") settle({ status: "aborted" });
      else settle({ status: "nomatch" });
    };
    rec.onend = () => settle({ status: "nomatch" });
    const timer = setTimeout(() => {
      settle({ status: "nomatch" });
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    }, timeoutMs);
    current = { rec, settle };
    try {
      rec.start();
    } catch {
      settle({ status: "unavailable" });
    }
  });
}
