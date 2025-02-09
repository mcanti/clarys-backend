export const findGoogleDocsLinks = (text: string): string[] => {
  const googleDocsRegex =
    /https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/g;
  return text.match(googleDocsRegex) || [];
};

export const findFileId = (googleDocUrl: string): string | null => {
  if (typeof googleDocUrl !== "string") {
    return null;
  }

  if (!googleDocUrl.startsWith("https://docs.google.com/document/")) {
    return null;
  }

  const fileIdMatch = googleDocUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return fileIdMatch ? fileIdMatch[1] : null;
};

