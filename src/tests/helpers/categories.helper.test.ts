import { containsSubstring } from "../../helpers/categories.helper";

describe("containsSubstring", () => {
  test("Should return true when base string contains substring", () => {
    expect(containsSubstring("Hello, World!", "world")).toBe(true);
  });

  test("Should return false when base string does not contain substring", () => {
    expect(containsSubstring("Hello, World!", "planet")).toBe(false);
  });

  test("Should be case insensitive", () => {
    expect(containsSubstring("JavaScript", "javascript")).toBe(true);
  });

  test("Should ignore non-alphanumeric characters", () => {
    expect(containsSubstring("Hello, World!", "hello world")).toBe(true);
  });

  test("Should handle empty substring as true", () => {
    expect(containsSubstring("Hello, World!", "")).toBe(true);
  });

  test("Should return false if base string is empty and substring is not", () => {
    expect(containsSubstring("", "text")).toBe(false);
  });

  test("Should return true if both base string and substring are empty", () => {
    expect(containsSubstring("", "")).toBe(true);
  });

  test("Should return false for completely different strings", () => {
    expect(containsSubstring("abcdef", "123")).toBe(false);
  });
});
