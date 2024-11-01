export const findGoogleDocsLinks = (text)=> {
    const googleDocsRegex = /https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/g;
    return text.match(googleDocsRegex) || [];
  }

  export const findFiledId = (googleDocUrl: string) => {
    const fileIdMatch = googleDocUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return fileIdMatch ? fileIdMatch[1] : null;
  } 