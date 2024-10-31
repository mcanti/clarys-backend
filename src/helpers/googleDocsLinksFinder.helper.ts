export const findGoogleDocsLinks = (text)=> {
    const googleDocsRegex = /https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/g;
    return text.match(googleDocsRegex) || [];
  }