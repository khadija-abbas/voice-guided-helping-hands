import { createContext, useContext, type MutableRefObject } from "react";

import type { Strings } from "@/lib/humnazar/i18n";
import type { Helper, Lang, SampleItemId } from "@/lib/humnazar/logic";

export type ScreenId =
  | "A" | "B" | "D" | "QP" | "F" | "Q" | "G" | "T" | "H" | "M" | "R" | "CD" | "W" | "WA"
  | "Y" | "YC" | "YR" | "V1" | "V2x" | "V3" | "V5" | "VM" | "VT";
export type Anim = "fwd" | "back" | "fade";
export type Mode = "quick" | "call" | "later";
/** Builds text for one language; speech may use English when no Urdu voice is installed. */
export type Say = (t: Strings, l: Lang) => string;
export type VoiceState = "unknown" | "ok" | "off";

export interface Request {
  number: string | null;
  photo: SampleItemId | null;
  widened: boolean;
  volunteerId: string | null;
}
export interface Session {
  lang: Lang;
  helper: Helper | null;
  lastMode: Mode | null;
  friends: string[];
  unavailable: Helper[];
  linkUsed: boolean;
  request: Request;
  askLater: { photo: SampleItemId | null; carried: boolean };
  askLaterNumber: string | null;
}

export interface Ctx {
  t: Strings;
  lang: Lang;
  langRef: MutableRefObject<Lang>;
  s: Session;
  blind: boolean;
  set: (fn: (s: Session) => Session) => void;
  go: (to: ScreenId, opts?: { replace?: boolean; reset?: ScreenId[]; anim?: Anim }) => void;
  back: () => void;
  confirmEnd: () => void;
  say: (build: Say, langOverride?: Lang) => Promise<boolean>;
  /** Two-press confirm: first press arms and explains, second press (or a spoken "yes") runs the action. */
  press: (id: string, msg: Say, action: () => void) => void;
  armed: string | null;
  armListening: boolean;
  voiceRef: MutableRefObject<VoiceState>;
  voice: VoiceState;
  markVoiceOff: () => Promise<void>;
  markVoiceOk: () => void;
}

export const PrototypeContext = createContext<Ctx | null>(null);
export function useP(): Ctx {
  const c = useContext(PrototypeContext);
  if (!c) throw new Error("Prototype context missing");
  return c;
}
