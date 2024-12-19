export const findGoogleDriveDocsLinks = (text) => {
  const googleDriveDocsRegex =
    /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/g;
  return text.match(googleDriveDocsRegex) || [];
};

export const extractFolderId = (url: string) => {
  const folderIdRegex = /\/folders\/([a-zA-Z0-9_-]+)/;
  const match = url.match(folderIdRegex);

  return match ? match[1] : null;
};
