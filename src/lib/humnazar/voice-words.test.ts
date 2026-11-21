import { describe, expect, it } from "vitest";
import { parseCallEnded, parseCmd, parseConfirm, parseEndCall, parseHelper, parseHelperCmd, parseNeedHelp, parseStartCall, parseHelpType, parseLanguage, parsePhoto, parseRating, parseShowHide, parseStartRole, parseYesNo, spellRequestNumber } from "./voice-words";

describe("spoken answers", () => {
  it("helper words in English and Urdu", () => {
    expect(parseHelper("a friend")).toBe("friend");
    expect(parseHelper("دوست")).toBe("friend");
    expect(parseHelper("woman")).toBe("woman");
    expect(parseHelper("خاتون")).toBe("woman");
    expect(parseHelper("عورت")).toBe("woman");
    expect(parseHelper("a man please")).toBe("man");
    expect(parseHelper("مرد")).toBe("man");
    expect(parseHelper("anyone")).toBe("anyone");
    expect(parseHelper("کوئی بھی")).toBe("anyone");
    expect(parseHelper("banana")).toBeNull();
  });

  it("language words", () => {
    expect(parseLanguage("Urdu")).toBe("ur");
    expect(parseLanguage("اردو")).toBe("ur");
    expect(parseLanguage("English")).toBe("en");
    expect(parseLanguage("انگریزی")).toBe("en");
  });

  it("help type words", () => {
    expect(parseHelpType("quick look")).toBe("quick");
    expect(parseHelpType("کوئیک لُک")).toBe("quick");
    expect(parseHelpType("call a human")).toBe("call");
    expect(parseHelpType("انسان")).toBe("call");
    expect(parseHelpType("رضاکار")).toBe("call");
    expect(parseHelpType("ask later")).toBe("later");
    expect(parseHelpType("بعد میں")).toBe("later");
  });

  it("yes and no words, including confirm words", () => {
    for (const w of ["yes", "ok", "confirm", "haan", "ہاں", "جی", "ٹھیک ہے"]) expect(parseYesNo(w)).toBe("yes");
    expect(parseYesNo("no")).toBe("no");
    expect(parseYesNo("نہیں")).toBe("no");
  });

  it("ratings 1 to 5 in English and Urdu", () => {
    expect(parseRating("4")).toBe(4);
    expect(parseRating("five")).toBe(5);
    expect(parseRating("ایک")).toBe(1);
    expect(parseRating("دو")).toBe(2);
    expect(parseRating("تین")).toBe(3);
    expect(parseRating("چار")).toBe(4);
    expect(parseRating("پانچ")).toBe(5);
    expect(parseRating("six")).toBeNull();
  });

  it("photo words", () => {
    expect(parsePhoto("the spice packet")).toBe("spice");
    expect(parsePhoto("مصالحہ")).toBe("spice");
    expect(parsePhoto("medicine strip")).toBe("medicine");
    expect(parsePhoto("دوا")).toBe("medicine");
    expect(parsePhoto("shirt")).toBe("shirt");
    expect(parsePhoto("قمیض")).toBe("shirt");
  });

  it("request number is read digit by digit", () => {
    expect(spellRequestNumber("HNZ-1115-4827")).toBe("H N Z, 1 1 1 5, 4 8 2 7");
  });
});


describe("spoken confirmation", () => {
  it("confirm words in English and Urdu navigate", () => {
    for (const w of ["confirm", "yes", "ok", "continue", "تصدیق", "ہاں", "جی", "ٹھیک ہے", "آگے"]) expect(parseConfirm(w)).toBe("confirm");
  });
  it("cancel words stay on the screen", () => {
    for (const w of ["cancel", "no", "منسوخ", "نہیں"]) expect(parseConfirm(w)).toBe("cancel");
    expect(parseConfirm("جی نہیں")).toBe("cancel");
  });
  it("repeat and back words", () => {
    expect(parseConfirm("repeat")).toBe("repeat");
    expect(parseConfirm("دوبارہ")).toBe("repeat");
    expect(parseConfirm("back")).toBe("back");
    expect(parseConfirm("واپس")).toBe("back");
  });
  it("unrelated speech is not an answer", () => {
    expect(parseConfirm("banana")).toBeNull();
  });
});

describe("screen commands", () => {
  it("checks commands in the order given", () => {
    expect(parseCmd("back to home", ["home"])).toBe("home");
    expect(parseCmd("مجھے مدد چاہیے", ["help"])).toBe("help");
    expect(parseCmd("ask later", ["call", "later"])).toBe("later");
    expect(parseCmd("banana", ["help"])).toBeNull();
  });
});

describe("show or hide number", () => {
  it("show and hide in English and Urdu", () => {
    expect(parseShowHide("show my number")).toBe("show");
    expect(parseShowHide("نمبر دکھائیں")).toBe("show");
    expect(parseShowHide("hide number")).toBe("hide");
    expect(parseShowHide("نمبر چھپائیں")).toBe("hide");
    expect(parseShowHide("number")).toBeNull();
  });
});

describe("first command on Home, Choose helper, Before the call, Live call, Call ended", () => {
  it("Home: I need help", () => {
    for (const w of ["I need help.", "need help", "Help!", "مجھے مدد چاہیے۔", "مدد"]) expect(parseNeedHelp(w)).toBe(true);
    expect(parseNeedHelp("banana")).toBe(false);
  });

  it("Choose helper: helper words and continue", () => {
    expect(parseHelperCmd("Friend")).toBe("friend");
    expect(parseHelperCmd("دوست")).toBe("friend");
    expect(parseHelperCmd("a lady")).toBe("woman");
    expect(parseHelperCmd("عورت")).toBe("woman");
    expect(parseHelperCmd("آدمی")).toBe("man");
    expect(parseHelperCmd("any one")).toBe("anyone");
    expect(parseHelperCmd("کوئی بھی")).toBe("anyone");
    expect(parseHelperCmd("Continue.")).toBe("continue");
    expect(parseHelperCmd("آگے")).toBe("continue");
    expect(parseHelperCmd("جاری رکھیں")).toBe("continue");
  });

  it("Before the call: start", () => {
    for (const w of ["Start the call", "start", "call", "begin", "شروع", "کال شروع کریں"]) expect(parseStartCall(w)).toBe(true);
    expect(parseStartCall("banana")).toBe(false);
  });

  it("Live call: end", () => {
    for (const w of ["End call", "end", "hang up", "finish", "کال ختم کریں", "ختم"]) expect(parseEndCall(w)).toBe(true);
    expect(parseEndCall("friend")).toBe(false);
  });

  it("Call ended: rating, friend, number, report, done", () => {
    expect(parseCallEnded("four")).toEqual({ k: "rate", n: 4 });
    expect(parseCallEnded("5")).toEqual({ k: "rate", n: 5 });
    expect(parseCallEnded("تین")).toEqual({ k: "rate", n: 3 });
    expect(parseCallEnded("Yes")).toEqual({ k: "friend", yes: true });
    expect(parseCallEnded("add friend")).toEqual({ k: "friend", yes: true });
    expect(parseCallEnded("ہاں")).toEqual({ k: "friend", yes: true });
    expect(parseCallEnded("no")).toEqual({ k: "friend", yes: false });
    expect(parseCallEnded("نہیں")).toEqual({ k: "friend", yes: false });
    expect(parseCallEnded("show number")).toEqual({ k: "number", show: true });
    expect(parseCallEnded("hide number")).toEqual({ k: "number", show: false });
    expect(parseCallEnded("report")).toEqual({ k: "report" });
    expect(parseCallEnded("رپورٹ")).toEqual({ k: "report" });
    expect(parseCallEnded("Done.")).toEqual({ k: "done" });
    expect(parseCallEnded("ہو گیا")).toEqual({ k: "done" });
    expect(parseCallEnded("banana")).toBeNull();
  });
});

describe("Quick Look photo and Choose helper: contains matching on the heard text", () => {
  it("picks the photo from any listed word inside the transcript", () => {
    expect(parsePhoto("Spices, please!")).toBe("spice");
    expect(parsePhoto("the masala one")).toBe("spice");
    expect(parsePhoto("tablets")).toBe("medicine");
    expect(parsePhoto("my clothes")).toBe("shirt");
    expect(parsePhoto("hello")).toBeNull();
  });
  it("matches helpers, checking woman before man and man as a whole word only", () => {
    expect(parseHelper("my frend")).toBe("friend");
    expect(parseHelper("Woman.")).toBe("woman");
    expect(parseHelper("women")).toBe("woman");
    expect(parseHelper("Man!")).toBe("man");
    expect(parseHelper("men")).toBe("man");
    expect(parseHelper("anybody")).toBe("anyone");
    expect(parseHelper("command")).toBeNull();
  });

  it("Start screen: blind user or volunteer, matched anywhere in the heard text", () => {
    expect(parseStartRole("I am a Blind user.")).toBe("user");
    expect(parseStartRole("low vision")).toBe("user");
    expect(parseStartRole("میں نابینا ہوں")).toBe("user");
    expect(parseStartRole("صارف")).toBe("user");
    expect(parseStartRole("اندھا")).toBe("user");
    expect(parseStartRole("Volunteer!")).toBe("volunteer");
    expect(parseStartRole("I'm a helper")).toBe("volunteer");
    expect(parseStartRole("رضاکار")).toBe("volunteer");
    expect(parseStartRole("والنٹیر")).toBe("volunteer");
    expect(parseStartRole("banana")).toBeNull();
  });
});
