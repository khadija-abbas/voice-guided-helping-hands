import { describe, expect, it } from "vitest";
import { parseHelper, parseHelpType, parseLanguage, parsePhoto, parseRating, parseYesNo, spellRequestNumber } from "./voice-words";

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
