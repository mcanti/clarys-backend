export const findGoogleDriveDocsLinks = (text: string): string[] => {
  const googleDriveDocsRegex =
    /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/g;
  return text.match(googleDriveDocsRegex) || [];
};

export const extractFolderId = (url: string): string | null => {
  if (typeof url !== "string" || !url.startsWith("https://drive.google.com/drive/folders/")) {
    return null;
  }

  const folderIdRegex = /\/folders\/([a-zA-Z0-9_-]+)(?:[/?]|$)/;
  const match = url.match(folderIdRegex);

  return match && match[1] ? match[1] : null;
};
