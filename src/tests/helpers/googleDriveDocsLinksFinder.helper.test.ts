import { findGoogleDriveDocsLinks, extractFolderId } from "../../helpers/googleDriveDocsLinksFinder.helper";

describe("findGoogleDriveDocsLinks", () => {
  it("should return an array with a valid Google Drive document link", () => {
    const text =
      "Check this document: https://drive.google.com/file/d/123ABCxyz";
    const result = findGoogleDriveDocsLinks(text);
    expect(result).toEqual(["https://drive.google.com/file/d/123ABCxyz"]);
  });

  it("should return multiple links if present", () => {
    const text =
      "Here are two docs: https://drive.google.com/file/d/abc123 and https://drive.google.com/file/d/xyz789";
    const result = findGoogleDriveDocsLinks(text);
    expect(result).toEqual([
      "https://drive.google.com/file/d/abc123",
      "https://drive.google.com/file/d/xyz789",
    ]);
  });

  it("should return an empty array if no Google Drive document links are found", () => {
    const text = "This text contains no Google Drive links.";
    const result = findGoogleDriveDocsLinks(text);
    expect(result).toEqual([]);
  });

  it("should return an empty array for an empty string", () => {
    const result = findGoogleDriveDocsLinks("");
    expect(result).toEqual([]);
  });

  it("should ignore invalid Google Drive links", () => {
    const text =
      "Invalid link: https://drive.google.com/file/invalid123 and https://drive.google.com/fake/d/abc123";
    const result = findGoogleDriveDocsLinks(text);
    expect(result).toEqual([]);
  });
});

describe("extractFolderId", () => {
  it("should extract the folder ID from a valid Google Drive folder URL", () => {
    const url = "https://drive.google.com/drive/folders/123ABCxyz";
    const result = extractFolderId(url);
    expect(result).toBe("123ABCxyz");
  });

  it("should return null for an invalid folder URL", () => {
    const url = "https://drive.google.com/drive/files/123ABCxyz";
    const result = extractFolderId(url);
    expect(result).toBeNull();
  });

  it("should return null for an empty string", () => {
    const result = extractFolderId("");
    expect(result).toBeNull();
  });

  it("should return null for completely invalid URLs", () => {
    const url = "https://randomwebsite.com/folders/123ABCxyz";
    const result = extractFolderId(url);
    expect(result).toBeNull();
  });

  it("should return null if there is no folder ID in the URL", () => {
    const url = "https://drive.google.com/drive/folders/";
    const result = extractFolderId(url);
    expect(result).toBeNull();
  });
});
