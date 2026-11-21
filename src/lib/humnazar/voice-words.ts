// Spoken-answer parsing for the blind-user screens. Accepts English and Urdu words.
import type { Helper, Lang, SampleItemId } from "./logic";

export type HelpTypeWord = "quick" | "call" | "later";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFC")
    // Punctuation, symbols, Urdu vowel marks and invisible joiners/direction marks all become spaces.
    .replace(/[\p{P}\p{S}\u064B-\u065F\u0670\u200B-\u200F\u2066-\u2069\uFEFF]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when any word or phrase appears as whole words in the heard text. */
function has(text: string, words: string[]): boolean {
  const n = ` ${norm(text)} `;
  return words.some((w) => n.includes(` ${norm(w)} `));
}

/** True when any word or phrase appears anywhere in the heard text (lowercased, punctuation removed). */
function contains(text: string, words: string[]): boolean {
  const n = norm(text);
  return words.some((w) => n.includes(norm(w)));
}

/** Choose helper: "contains" matching; woman is checked before man, and man matches whole words only. */
export function parseHelper(text: string): Helper | null {
  if (contains(text, ["friend", "friends", "frend", "دوست"])) return "friend";
  if (contains(text, ["woman", "women", "lady", "خاتون", "عورت"])) return "woman";
  if (has(text, ["man", "men", "مرد", "آدمی"])) return "man";
  if (contains(text, ["anyone", "any one", "anybody", "کوئی بھی"])) return "anyone";
  return null;
}

export function parseLanguage(text: string): Lang | null {
  if (has(text, ["urdu", "اردو"])) return "ur";
  if (has(text, ["english", "inglish", "angrezi", "انگریزی", "انگلش", "انگلیش"])) return "en";
  return null;
}

export function parseHelpType(text: string): HelpTypeWord | null {
  if (has(text, ["quick look", "quick", "look", "quicklook", "کوئیک لک", "کوئیک", "کوئک", "فوری نظر", "فوری"])) return "quick";
  if (has(text, ["ask later", "later", "بعد میں", "بعد"])) return "later";
  if (has(text, ["call a human", "human", "call", "person", "volunteer", "انسان", "رضاکار", "کال"])) return "call";
  return null;
}

/** "No" wins when both appear, so "جی نہیں" (no, thank you) is a no. */
export function parseYesNo(text: string): "yes" | "no" | null {
  if (has(text, ["no", "nope", "nahi", "nahin", "نہیں"])) return "no";
  if (has(text, ["yes", "yeah", "yep", "ok", "okay", "confirm", "sure", "haan", "han", "ہاں", "جی", "ٹھیک ہے", "ٹھیک", "اوکے"])) return "yes";
  return null;
}

const RATING_WORDS: [number, string[]][] = [
  [1, ["1", "۱", "one", "ایک"]],
  [2, ["2", "۲", "two", "دو"]],
  [3, ["3", "۳", "three", "تین"]],
  [4, ["4", "۴", "four", "چار"]],
  [5, ["5", "۵", "five", "پانچ"]],
];
export function parseRating(text: string): number | null {
  return RATING_WORDS.find(([, w]) => has(text, w))?.[0] ?? null;
}

/** Quick Look: take photo. "Contains" matching on the heard text. */
export function parsePhoto(text: string): Exclude<SampleItemId, "bill"> | null {
  if (contains(text, ["spice", "packet", "masala", "مصالحہ"])) return "spice";
  if (contains(text, ["medicine", "strip", "tablet", "دوا"])) return "medicine";
  if (contains(text, ["shirt", "shirts", "clothes", "قمیض"])) return "shirt";
  return null;
}

/** "Show my number" / "hide my number" on Call ended. Hide wins when both appear. */
export function parseShowHide(text: string): "show" | "hide" | null {
  if (has(text, ["hide", "hide number", "hide my number", "چھپائیں", "چھپاؤ", "چھپا دیں", "نمبر چھپائیں"])) return "hide";
  if (has(text, ["show", "show number", "show my number", "دکھائیں", "دکھاؤ", "دکھا دیں", "نمبر دکھائیں"])) return "show";
  return null;
}

/** Request numbers are read digit by digit: HNZ-1115-4827 -> "H N Z, 1 1 1 5, 4 8 2 7". */
export function spellRequestNumber(no: string): string {
  return no
    .split("-")
    .map((part) => part.split("").join(" "))
    .join(", ");
}

/* ---------- Spoken confirmation and screen commands ---------- */

export type ConfirmWord = "confirm" | "cancel" | "repeat" | "back";

const CONFIRM_WORDS: [ConfirmWord, string[]][] = [
  // Cancel is checked first so "جی نہیں" or "no, cancel" never confirms.
  ["cancel", ["cancel", "no", "nope", "stop", "nahi", "nahin", "منسوخ", "نہیں", "کینسل"]],
  ["back", ["back", "go back", "wapas", "واپس", "بیک"]],
  ["repeat", ["repeat", "say again", "again", "dobara", "دوبارہ", "ریپیٹ"]],
  ["confirm", ["confirm", "confirmed", "yes", "yeah", "yep", "ok", "okay", "continue", "haan", "han", "ji", "تصدیق", "ہاں", "جی", "ٹھیک ہے", "ٹھیک", "آگے", "کنفرم", "اوکے"]],
];
/** Answer to "Say confirm or cancel". Also understands repeat and back. */
export function parseConfirm(text: string): ConfirmWord | null {
  return CONFIRM_WORDS.find(([, w]) => has(text, w))?.[0] ?? null;
}

export const CMD_WORDS = {
  help: ["help", "need help", "i need help", "madad", "مدد", "مدد چاہیے"],
  takePhoto: ["take photo", "take a photo", "photo", "picture", "camera", "تصویر", "تصویر لیں", "فوٹو"],
  notSure: ["not sure", "human", "call a human", "call", "person", "یقین نہیں", "انسان", "کال"],
  done: ["done", "finish", "finished", "ho gaya", "ہو گیا", "ہوگیا", "مکمل"],
  continue: ["continue", "next", "jari", "جاری", "جاری رکھیں", "آگے"],
  start: ["start", "start the call", "start call", "shuru", "شروع", "کال شروع کریں"],
  end: ["end", "end call", "end the call", "khatam", "ختم", "کال ختم کریں"],
  home: ["home", "go home", "back to home", "ہوم", "ہوم پر واپس"],
  widen: ["widen", "anyone", "widen to anyone", "کسی سے بھی", "کوئی بھی"],
  other: ["other", "another", "another option", "other option", "دوسرا", "دوسرا طریقہ"],
  later: ["later", "ask later", "send later", "بعد میں", "بعد"],
  call: ["call a human", "human", "call", "person", "volunteer", "انسان", "رضاکار", "کال"],
  addPhoto: ["add photo", "photo", "picture", "تصویر", "تصویر شامل کریں", "فوٹو"],
  record: ["record", "voice note", "recording", "ریکارڈ", "ریکارڈ کریں", "صوتی پیغام"],
  send: ["send", "bhejo", "بھیجیں", "بھیج دیں", "بھیجو"],
  open: ["open", "listen", "reply", "کھولیں", "سنیں", "جواب"],
  play: ["play", "listen", "play reply", "چلائیں", "سنیں", "جواب چلائیں"],
  rate: ["rate", "rating", "ریٹنگ", "درجہ", "درجہ بندی"],
  friend: ["friend", "add friend", "dost", "دوست"],
  number: ["number", "my number", "show number", "نمبر", "میرا نمبر"],
  report: ["report", "complain", "complaint", "شکایت", "رپورٹ"],
} satisfies Record<string, string[]>;
export type CmdWord = keyof typeof CMD_WORDS;

/** First command (in the order given) whose words were heard. */
export function parseCmd(text: string, order: CmdWord[]): CmdWord | null {
  return order.find((k) => has(text, CMD_WORDS[k])) ?? null;
}

/* ---------- First command on five blind-user screens (Home, Choose helper, Before the call, Live call, Call ended) ---------- */

const NEED_HELP = ["i need help", "need help", "help", "mujhe madad chahiye", "madad", "مجھے مدد چاہیے", "مدد چاہیے", "مدد", "ہیلپ"];
/** Home: "I need help". */
export function parseNeedHelp(text: string): boolean {
  return has(text, NEED_HELP);
}

const CONTINUE = ["continue", "next", "jari", "jari rakhen", "aage", "آگے", "جاری", "جاری رکھیں"];
/** Choose helper: a helper word sets the helper; "continue" moves on. */
export function parseHelperCmd(text: string): Helper | "continue" | null {
  return parseHelper(text) ?? (has(text, CONTINUE) ? "continue" : null);
}

const START_CALL = ["start the call", "start call", "start", "call", "begin", "shuru", "شروع", "کال شروع کریں", "کال", "اسٹارٹ", "سٹارٹ"];
/** Before the call: "start the call". */
export function parseStartCall(text: string): boolean {
  return has(text, START_CALL);
}

const END_CALL = ["end call", "end the call", "end", "hang up", "finish", "khatam", "کال ختم کریں", "ختم", "اینڈ", "فنش"];
/** Live call: "end call". */
export function parseEndCall(text: string): boolean {
  return has(text, END_CALL);
}

export type CallEndedCmd =
  | { k: "number"; show: boolean }
  | { k: "report" }
  | { k: "done" }
  | { k: "friend"; yes: boolean }
  | { k: "rate"; n: number };
const REPORT = ["report", "complain", "complaint", "shikayat", "رپورٹ", "شکایت"];
const DONE = ["done", "ho gaya", "ہو گیا", "ہوگیا", "مکمل", "ڈن"];
const FRIEND_NO = ["no", "nope", "nahi", "nahin", "نہیں"];
const FRIEND_YES = ["yes", "yeah", "yep", "add friend", "add as friend", "add as a friend", "haan", "han", "ہاں", "دوست بنائیں"];
/** Call ended: show/hide number, report, done, friend yes/no, then a rating from 1 to 5. */
export function parseCallEnded(text: string): CallEndedCmd | null {
  const sh = parseShowHide(text);
  if (sh) return { k: "number", show: sh === "show" };
  if (has(text, REPORT)) return { k: "report" };
  if (has(text, DONE)) return { k: "done" };
  if (has(text, FRIEND_NO)) return { k: "friend", yes: false };
  if (has(text, FRIEND_YES)) return { k: "friend", yes: true };
  const n = parseRating(text);
  return n ? { k: "rate", n } : null;
}
