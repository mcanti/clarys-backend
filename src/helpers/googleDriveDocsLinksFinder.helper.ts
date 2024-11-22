export const findGoogleDriveDocsLinks = (text) => {
    const googleDriveDocsRegex = /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/g;
    return text.match(googleDriveDocsRegex) || [];
  };
  