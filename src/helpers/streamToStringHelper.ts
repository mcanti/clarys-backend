import { Readable } from "stream";

export const streamToString = async (stream: Readable): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    stream.on("error", reject);
  });
};

export const stringToStream = (data: string): Readable => {
  return Readable.from(data);
};

export const bufferToStream = (buffer: Buffer): Readable => {
  return Readable.from(buffer);
};
