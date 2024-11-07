export const containsSubstring = (
  baseString: string,
  substring: string
): boolean => {
  const normalize = (str: string) =>
    str.toLowerCase().replace(/[^a-z0-9]/g, "");

  const normalizedBase = normalize(baseString);
  const normalizedSubstring = normalize(substring);

  return normalizedBase.includes(normalizedSubstring);
};
