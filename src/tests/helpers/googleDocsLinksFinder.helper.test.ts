import { findGoogleDocsLinks, findFileId } from "../../helpers/googleDocsLinksFinder.helper";

describe("findGoogleDocsLinks", () => {
  test("should return an array of Google Docs links from the text", () => {
    const text = "Here are some links: https://docs.google.com/document/d/abc123 and https://docs.google.com/document/d/def456";
    const result = findGoogleDocsLinks(text);
    expect(result).toEqual([
      "https://docs.google.com/document/d/abc123",
      "https://docs.google.com/document/d/def456",
    ]);
  });

  test("should return an empty array when no Google Docs links are present", () => {
    const text = "Here are some links: https://example.com and https://anotherexample.com";
    const result = findGoogleDocsLinks(text);
    expect(result).toEqual([]);
  });

  test("should return an empty array for an empty text input", () => {
    const text = "";
    const result = findGoogleDocsLinks(text);
    expect(result).toEqual([]);
  });
});

describe("findFileId", () => {
  test("should extract the file ID from a valid Google Docs URL", () => {
    const googleDocUrl = "https://docs.google.com/document/d/abc123";
    const result = findFileId(googleDocUrl);
    expect(result).toBe("abc123");
  });

  test("should return null for an invalid Google Docs URL", () => {
    const googleDocUrl = "https://example.com/document/d/abc123";
    const result = findFileId(googleDocUrl);
    expect(result).toBeNull();
  });

  test("should return null for a URL without a file ID", () => {
    const googleDocUrl = "https://docs.google.com/document/d/";
    const result = findFileId(googleDocUrl);
    expect(result).toBeNull();
  });

  test("should return null for a completely invalid URL", () => {
    const googleDocUrl = "https://invalid-url.com";
    const result = findFileId(googleDocUrl);
    expect(result).toBeNull();
  });
});
