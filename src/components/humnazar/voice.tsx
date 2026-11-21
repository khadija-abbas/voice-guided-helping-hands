import { useEffect, useRef, useState, type ReactNode } from "react";

import { listen, stopListening } from "@/lib/humnazar/speech";
import { useP, type Say } from "./context";
import { Icon } from "./ui";

/* ---------- Two-press confirm button ---------- */

export function ConfirmBtn({ id, msg, onConfirm, cls = "hz-bt hz-p", disabled, busy, children, label }: {
  id: string; msg: Say; onConfirm: () => void; cls?: string; disabled?: boolean | undefined; busy?: boolean | undefined; children: ReactNode; label?: string | undefined;
}) {
  const { press, armed, armListening, t } = useP();
  const on = armed === id;
  return (
    <div className="hz-cf">
      <button
        type="button"
        className={`${cls}${on ? " is-armed" : ""}${busy ? " is-busy" : ""}`}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        aria-label={label}
        aria-describedby={on ? `hz-hint-${id}` : undefined}
        onClick={() => press(id, msg, onConfirm)}
      >
        {children}
      </button>
      {on && <ArmHint id={id} listening={armListening} text={t.pressAgain} listeningText={t.listening} />}
    </div>
  );
}

export function ArmHint({ id, listening, text, listeningText }: { id: string; listening: boolean; text: string; listeningText: string }) {
  return (
    <div id={`hz-hint-${id}`} className="hz-armhint hz-fade-in" role="status">
      <Icon n={listening ? "mc" : "in"} />
      <span>{text}{listening ? ` · ${listeningText}` : ""}</span>
    </div>
  );
}

/* ---------- Ask by voice ---------- */

type Status = "idle" | "listening" | "heard" | "failed";
type AskOutcome = "ok" | "fail" | "off" | "cancel";

/** Speaks a question (optional), listens up to 6 s, retries once with "Sorry…", then asks to tap again. */
export function useVoiceAsk<T>(parse: (text: string) => T | null, onValue: (v: T) => void) {
  const { say, langRef, voiceRef, markVoiceOff, markVoiceOk } = useP();
  const [status, setStatus] = useState<Status>("idle");
  const [heard, setHeard] = useState("");
  const alive = useRef(true);
  const onValueRef = useRef(onValue);
  onValueRef.current = onValue;
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const ask = async (question?: Say): Promise<AskOutcome> => {
    stopListening();
    if (question) {
      const ok = await say(question);
      if (!ok || !alive.current) return "cancel";
    }
    if (voiceRef.current === "off") { await markVoiceOff(); return "off"; }
    for (let attempt = 0; attempt < 2; attempt++) {
      setStatus("listening");
      const r = await listen(langRef.current, 6000);
      if (!alive.current) return "cancel";
      if (r.status === "aborted") { setStatus("idle"); return "cancel"; }
      if (r.status === "unavailable") { setStatus("idle"); await markVoiceOff(); return "off"; }
      markVoiceOk();
      if (r.status === "ok") {
        setHeard(r.text);
        const hit = r.alternatives.map(parse).find((v) => v !== null && v !== undefined);
        if (hit !== undefined && hit !== null) {
          setStatus("heard");
          onValueRef.current(hit);
          return "ok";
        }
      }
      if (attempt === 0) {
        setStatus("idle");
        const ok = await say((t) => t.sorry);
        if (!ok || !alive.current) return "cancel";
      }
    }
    setStatus("failed");
    void say((t) => t.tapRetry);
    return "fail";
  };
  return { status, heard, ask };
}

function VoiceStatus({ status, heard }: { status: Status; heard: string }) {
  const { t } = useP();
  if (status === "idle") return null;
  if (status === "listening") return <span className="hz-vs" role="status"><Icon n="mc" />{t.listening}</span>;
  if (status === "heard") return <span className="hz-vs" role="status"><Icon n="ck" />{t.heard(heard)}</span>;
  return <span className="hz-vs fail" role="status"><Icon n="al" />{heard ? `${t.heard(heard)} · ` : ""}{t.tapRetry}</span>;
}

/** Full-width 88px row: label on line 1, current value on line 2. Tapping asks the question aloud and listens. */
export function VoiceRow<T>({ label, value, question, parse, onValue, choices }: {
  label: string; value: string; question: Say; parse: (text: string) => T | null; onValue: (v: T) => void;
  choices: { label: string; value: T }[];
}) {
  const { t, voice } = useP();
  const [fallback, setFallback] = useState(false);
  const { status, heard, ask } = useVoiceAsk(parse, onValue);
  const tap = async () => {
    setFallback(false);
    const r = await ask(question);
    if (r === "off") setFallback(true);
  };
  return (
    <>
      <button type="button" className={`hz-row${status === "listening" ? " is-listening" : ""}`} onClick={tap} aria-label={`${label}: ${value}. ${t.tapToSpeak}`}>
        <span className="tx">
          <span className="l">{label}</span>
          <span className="v">{value}</span>
          <VoiceStatus status={status} heard={heard} />
        </span>
        <span className="ic" aria-hidden="true"><Icon n="mc" s={28} /></span>
      </button>
      {fallback && voice === "off" && (
        <div className="hz-fb hz-fade-in">
          <b>{t.fallbackLabel}</b>
          <p className="hz-note">{t.voiceOff}</p>
          {choices.map((c) => (
            <button key={c.label} type="button" className="hz-bt hz-pr" onClick={() => { setFallback(false); onValue(c.value); }}>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/** "Say your choice" row for screens whose choices are already big buttons; a spoken choice arms that button. */
export function ListenRow<T>({ question, parse, onValue, startSignal }: {
  question: Say; parse: (text: string) => T | null; onValue: (v: T) => void; startSignal: number;
}) {
  const { t, voice, voiceRef, markVoiceOff } = useP();
  const { status, heard, ask } = useVoiceAsk(parse, onValue);
  const askRef = useRef(ask);
  askRef.current = ask;
  useEffect(() => {
    if (startSignal === 0) return;
    if (voiceRef.current === "off") { void markVoiceOff(); return; }
    void askRef.current();
  }, [startSignal, voiceRef, markVoiceOff]);
  // Choices are already big buttons; the one-time "voice is off" message is spoken by markVoiceOff.
  if (voice === "off") return null;
  return (
    <button type="button" className={`hz-row${status === "listening" ? " is-listening" : ""}`} onClick={() => void ask(question)} aria-label={`${t.sayChoice}. ${t.tapToSpeak}`}>
      <span className="tx">
        <span className="l">{t.sayChoice}</span>
        {status === "idle" ? <span className="hz-vs"><Icon n="mc" />{t.tapToSpeak}</span> : <VoiceStatus status={status} heard={heard} />}
      </span>
      <span className="ic" aria-hidden="true"><Icon n="mc" s={28} /></span>
    </button>
  );
}
