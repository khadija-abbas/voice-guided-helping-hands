import { describe, expect, it } from "vitest";
import {
  acceptingVolunteer,
  acceptAtSecondsLeft,
  canWiden,
  makeRequestNumber,
  needsHuman,
  SAMPLE_ITEM_KIND,
} from "./logic";

describe("Humnazar sample rules", () => {
  it("a friend request is accepted by Bilal", () => {
    expect(acceptingVolunteer("friend")?.id).toBe("bilal");
  });

  it("a man or anyone request is accepted by Imran", () => {
    expect(acceptingVolunteer("man")?.id).toBe("imran");
    expect(acceptingVolunteer("anyone")?.id).toBe("imran");
  });

  it("a woman request always ends with no one accepting", () => {
    expect(acceptingVolunteer("woman")).toBeNull();
  });

  it("widen to anyone is only offered for woman or man", () => {
    expect(canWiden("woman")).toBe(true);
    expect(canWiden("man")).toBe(true);
    expect(canWiden("friend")).toBe(false);
    expect(canWiden("anyone")).toBe(false);
  });

  it("acceptance lands at about 4 of the 5 demo seconds", () => {
    expect(acceptAtSecondsLeft).toBe(12);
  });

  it("spice packet goes to AI; medicine strip and shirt style need a human", () => {
    expect(needsHuman(SAMPLE_ITEM_KIND.spice)).toBe(false);
    expect(needsHuman(SAMPLE_ITEM_KIND.medicine)).toBe(true);
    expect(needsHuman(SAMPLE_ITEM_KIND.shirt)).toBe(true);
  });

  it("request number is HNZ-MMDD-4 digits", () => {
    expect(makeRequestNumber(new Date(2026, 10, 15), () => 0.4827)).toBe("HNZ-1115-4827");
    expect(makeRequestNumber(new Date(2026, 0, 3), () => 0.0005)).toBe("HNZ-0103-0005");
  });
});
