export const jsonToBlob = (jsonObject: Record<string, unknown>): Blob => {
  const jsonString = JSON.stringify(jsonObject);
  return new Blob([jsonString], { type: "application/json" });
};

export const fileToBlob = (file: string | ArrayBuffer | Uint8Array): Blob => {
  return new Blob([file], { type: typeof file });
};
