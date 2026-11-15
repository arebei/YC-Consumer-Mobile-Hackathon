import { describe, expect, test } from "vitest";
import { cleanFlag } from "./flag";

describe("cleanFlag", () => {
  test("1. collapses whitespace and trims", () => {
    expect(cleanFlag("  hello   there \n")).toBe("hello there");
  });
  test("2. a 60-character string comes back 40 long", () => {
    expect(Array.from(cleanFlag("a".repeat(60))!).length).toBe(40);
  });
  test("3. blank input is null", () => {
    expect(cleanFlag("   ")).toBeNull();
    expect(cleanFlag("")).toBeNull();
  });
  test("4. 45 emoji come back as 40 whole emoji", () => {
    const out = cleanFlag("😀".repeat(45))!;
    expect(Array.from(out).length).toBe(40);
    expect(out).toBe("😀".repeat(40));
  });
  test("line breaks become one space", () => {
    expect(cleanFlag("thanks\nfor the\r\n coffee")).toBe("thanks for the coffee");
  });
});
