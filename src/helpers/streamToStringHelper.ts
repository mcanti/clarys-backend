import { Readable, pipeline, PassThrough } from "stream";
import { createWriteStream, createReadStream } from "fs";
import { promisify } from "util";
import { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { BlobLike, ResponseLike } from "openai/uploads";

export const streamToString = async (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    const handleError = (error: Error) => {
      stream.removeAllListeners(); // Ensure no more events are fired
      reject(error);
    };

    stream.on("data", (chunk) => {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (chunk instanceof Uint8Array) {
        chunks.push(Buffer.from(chunk));
      } else if (typeof chunk === "string") {
        chunks.push(Buffer.from(chunk, "utf-8"));
      } else {
        handleError(new Error(`Unsupported chunk type: ${typeof chunk}`));
      }
    });

    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    stream.on("error", handleError);
  });
};

export const stringToStream = (data: string): Readable => {
  return Readable.from(data);
};

export const bufferToStream = (buffer: Buffer): Readable => {
  return Readable.from(buffer);
};

export const streamToBlob = async(stream: Readable, type = 'application/octet-stream'): Promise<Blob>=> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return new Blob(chunks, { type });
}

const pipelineAsync = promisify(pipeline);

export const createBlobLike = (content: string, type: string): BlobLike => {
  return {
    size: content.length,
    type,
    text: async () => content,
    slice: (start?: number, end?: number) => {
      const slicedContent = content.slice(start ?? 0, end ?? content.length);
      return createBlobLike(slicedContent, type);
    },
  };
}

export const readableToFsReadStream = async (readable: Readable) => {
  const tempFilePath = "./tempFile.json";
  const writeStream = createWriteStream(tempFilePath);

  await pipelineAsync(readable, writeStream);

  return createReadStream(tempFilePath);
};

export const s3BodyToResponseLike = async (
  body: Readable,
  url: string,
  type = 'text/plain' // Adjust MIME type as needed
): Promise<ResponseLike> => {
  const content = await streamToString(body);

  const blob = createBlobLike(content, type);

  return {
    url,
    blob: async () => blob,
  };
}


export const s3ToFileLike = async(
  s3Object: GetObjectCommandOutput,
  fileName: string
) => {
  const fileContent = await streamToString(s3Object.Body as Readable);
  return {
    name: fileName,
    lastModified: Date.now(),
    size: fileContent.length,
    type: 'text/plain', // Change based on your file type
    text: async () => fileContent,
    slice: (start?: number, end?: number) => ({
      size: end! - start!,
      type: 'text/plain',
      text: async () => fileContent.slice(start, end),
      slice: () => null, // Placeholder implementation
    }),
  };
}

export const ensureReadableStream = (body: any): Readable => {
  try {
    if (body instanceof Readable) {
      // If it's already a Node.js Readable stream, return it directly
      return body;
    } else if (Buffer.isBuffer(body)) {
      // If it's a Buffer, wrap it in a Readable stream
      return Readable.from(body);
    } else if (typeof body === 'string') {
      // If it's a string, convert it to a Readable stream
      return Readable.from([body]);
    } else if (body instanceof Uint8Array) {
      // If it's a Uint8Array, convert it to a Readable stream
      return Readable.from(Buffer.from(body));
    } else if (body && typeof body.getReader === 'function') {
      // If it's a browser-native ReadableStream, convert it to a Node.js Readable
      const reader = body.getReader();
      return new Readable({
        async read() {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null); // Signal the end of the stream
          } else {
            this.push(Buffer.from(value)); // Push Uint8Array data as Buffer
          }
        },
      });
    } else {
      throw new Error('Unsupported S3 Body type. Unable to convert to a Readable stream.');
    }
  } catch (error) {
    console.error('Error in ensureReadableStream:', error);
    throw error;
  }
};

export const webStreamToNodeReadable = async (webStream: ReadableStream<any>): Promise<Readable> => {
  const reader = webStream.getReader();

  return new Promise((resolve, reject) => {
    const nodeStream = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(value);
          }
        } catch (error) {
          this.destroy(error);
        }
      },
    });

    reader.closed
      .then(() => resolve(nodeStream))
      .catch((error) => {
        nodeStream.destroy(error);
        reject(error);
      });

    nodeStream.on("error", reject);
  });
};
