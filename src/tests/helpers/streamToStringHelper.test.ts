import {
  streamToString,
  stringToStream,
  bufferToStream,
  streamToBlob,
  createBlobLike,
  readableToFsReadStream,
  s3BodyToResponseLike,
  s3ToFileLike,
  ensureReadableStream,
  webStreamToNodeReadable,
} from "../../helpers/streamToStringHelper";

import { Readable, PassThrough } from "stream";
import { GetObjectCommandOutput } from "@aws-sdk/client-s3";

describe("streamToString", () => {
  it("should convert a readable stream to a string", async () => {
    const stream = Readable.from(["Hello, world!"]); // Ensure an array is passed
    const result = await streamToString(stream);
    expect(result).toBe("Hello, world!");
  });

  it("should handle Uint8Array chunks in the stream", async () => {
    const uintArray = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" in bytes
    const stream = new Readable({
      read() {
        this.push(uintArray);
        this.push(null);
      },
    });
  
    const result = await streamToString(stream);
    expect(result).toBe("Hello");
  });

  it("should return an empty string for an empty stream", async () => {
    const stream = Readable.from([]); // Empty array to properly simulate an empty stream
    const result = await streamToString(stream);
    expect(result).toBe("");
  });

  it("should reject for unsupported chunk type", async () => {
    const badStream = new Readable({
      read() {} // Empty read method to simulate _read()
    });
  
    setImmediate(() => {
      badStream.emit("data", { key: "value" }); // Emit an object as an invalid chunk
      badStream.emit("end");
    });
  
    await expect(streamToString(badStream)).rejects.toThrow("Unsupported chunk type: object");
  });

  it("should reject when stream emits an error", async () => {
    const badStream = new Readable({
      read() {}
    });
  
    setImmediate(() => {
      badStream.emit("error", new Error("Stream failure"));
    });
  
    await expect(streamToString(badStream)).rejects.toThrow("Stream failure");
  });

  it("should reject if the stream emits an error before any data is read", async () => {
    const failingStream = new Readable({
      read() {},
    });
  
    setImmediate(() => failingStream.emit("error", new Error("Early stream failure")));
  
    await expect(streamToString(failingStream)).rejects.toThrow("Early stream failure");
  });

  it("should return an empty string if the stream closes immediately", async () => {
    const emptyStream = new Readable({
      read() {
        this.push(null);
      },
    });
  
    const result = await streamToString(emptyStream);
    expect(result).toBe("");
  });

  it("should resolve an empty string when stream ends without emitting data", async () => {
    const emptyStream = new Readable({
      read() {
        this.push(null);
      },
    });
  
    const result = await streamToString(emptyStream);
    expect(result).toBe("");
  });

  it("should remove all listeners and reject when stream emits an error", async () => {
    const badStream = new Readable({
      read() {},
    });
  
    setImmediate(() => {
      badStream.emit("error", new Error("Stream failure"));
    });
  
    await expect(streamToString(badStream)).rejects.toThrow("Stream failure");
    expect(badStream.listenerCount("data")).toBe(0);
  });
  
  
});

describe("stringToStream", () => {
  it("should convert a string to a readable stream", async () => {
    const stream = stringToStream("Test string");
    const result = await streamToString(stream);
    expect(result).toBe("Test string");
  });
});

describe("bufferToStream", () => {
  it("should convert a buffer to a readable stream", async () => {
    const buffer = Buffer.from("Buffered data");
    const stream = bufferToStream(buffer);
    const result = await streamToString(stream);
    expect(result).toBe("Buffered data");
  });
});

describe("streamToBlob", () => {
  it("should convert a readable stream to a Blob", async () => {
    const stream = Readable.from("Blob data");
    const blob = await streamToBlob(stream, "text/plain");

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/plain");

    const text = await blob.text();
    expect(text).toBe("Blob data");
  });
});

describe("createBlobLike", () => {
  it("should create a BlobLike object", async () => {
    const blob = createBlobLike("Sample content", "text/plain");

    expect(blob.size).toBe(14);
    expect(blob.type).toBe("text/plain");

    const text = await blob.text();
    expect(text).toBe("Sample content");
  });

  it("should slice a BlobLike object", async () => {
    const blob = createBlobLike("Sample content", "text/plain");
    const slicedBlob = blob.slice(0, 6);

    expect(slicedBlob.size).toBe(6);
    const text = await slicedBlob.text();
    expect(text).toBe("Sample");
  });
});

describe("readableToFsReadStream", () => {
  it("should convert a readable stream to an fs read stream", async () => {
    const stream = Readable.from("File content");
    const fsStream = await readableToFsReadStream(stream);

    expect(fsStream).toBeInstanceOf(Readable);
    const content = await streamToString(fsStream);
    expect(content).toBe("File content");
  });
});

describe("s3BodyToResponseLike", () => {
  it("should convert an S3 body to a ResponseLike object", async () => {
    const stream = Readable.from("S3 content");
    const response = await s3BodyToResponseLike(stream, "https://example.com");

    expect(response.url).toBe("https://example.com");

    const blob = await response.blob();
    expect(blob).toBeInstanceOf(Object);
    const text = await blob.text();
    expect(text).toBe("S3 content");
  });
});

describe("s3ToFileLike", () => {
  it("should convert S3 object to a file-like object", async () => {
    // Mock Readable stream
    const readableStream = Readable.from("S3 file content");

    // Mock AWS GetObjectCommandOutput with required $metadata
    const s3Object: GetObjectCommandOutput = {
      Body: readableStream as any, // Cast to any to bypass AWS type restrictions
      $metadata: {
        httpStatusCode: 200,
        requestId: "test-request-id",
        extendedRequestId: "test-extended-id",
        cfId: "test-cf-id",
        attempts: 1,
        totalRetryDelay: 0,
      },
    };

    const fileLike = await s3ToFileLike(s3Object, "test.txt");

    expect(fileLike.name).toBe("test.txt");
    expect(fileLike.size).toBe(15);
    expect(await fileLike.text()).toBe("S3 file content");
  });

  it("should throw an error when s3Object.Body is null", async () => {
    const mockS3Object = { Body: null } as any;
    await expect(s3ToFileLike(mockS3Object, "test.txt")).rejects.toThrow();
  });

  it("should throw an error if s3Object.Body is a number", async () => {
    const mockS3Object = { Body: 12345 } as any;
    await expect(s3ToFileLike(mockS3Object, "file.txt")).rejects.toThrow();
  });  

  it("should throw an error if s3Object.Body is not a readable stream", async () => {
    const mockS3Object = { Body: null } as any;
    await expect(s3ToFileLike(mockS3Object, "test.txt")).rejects.toThrow();
  });

  it("should throw an error when s3Object.Body is missing", async () => {
    const mockS3Object = { Body: undefined } as any;
    await expect(s3ToFileLike(mockS3Object, "file.txt")).rejects.toThrow();
  });
  
});

describe("ensureReadableStream", () => {
  it("should return the same readable stream if already readable", () => {
    const stream = Readable.from("Stream data");
    expect(ensureReadableStream(stream)).toBe(stream);
  });

  it("should convert a Uint8Array to a readable stream", async () => {
    const uint8Array = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const stream = ensureReadableStream(uint8Array);
    expect(await streamToString(stream)).toBe("Hello");
  });
  

  it("should convert a string to a readable stream", async () => {
    const stream = ensureReadableStream("String data");
    expect(await streamToString(stream)).toBe("String data");
  });

  it("should convert a buffer to a readable stream", async () => {
    const buffer = Buffer.from("Buffered input");
    const stream = ensureReadableStream(buffer);
    expect(await streamToString(stream)).toBe("Buffered input");
  });

  it("should convert a Uint8Array to a readable stream", async () => {
    const uint8Array = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const stream = ensureReadableStream(uint8Array);
    expect(await streamToString(stream)).toBe("Hello");
  });

  it("should handle Uint8Array input", async () => {
    const uintArray = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" in bytes
    const stream = ensureReadableStream(uintArray);
    
    expect(stream).toBeInstanceOf(Readable);
    const result = await streamToString(stream);
    expect(result).toBe("Hello");
  });

  it("should convert a browser-native ReadableStream to a Node.js Readable", async () => {
    const mockWebStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("Hello World"));
        controller.close();
      },
    });
  
    const nodeStream = ensureReadableStream(mockWebStream);
    expect(nodeStream).toBeInstanceOf(Readable);
  
    const result = await streamToString(nodeStream);
    expect(result).toBe("Hello World");
  });  

  it("should throw an error for unsupported input type in ensureReadableStream", () => {
    expect(() => ensureReadableStream(123 as any)).toThrow("Unsupported S3 Body type");
  });

  it("should throw an error for unsupported input (null) in ensureReadableStream", () => {
    expect(() => ensureReadableStream(null)).toThrow("Unsupported S3 Body type");
  });

  it("should throw an error for unsupported input (empty object) in ensureReadableStream", () => {
    expect(() => ensureReadableStream({} as any)).toThrow("Unsupported S3 Body type");
  });
    
  it("should throw an error for unsupported input (array) in ensureReadableStream", () => {
    expect(() => ensureReadableStream([1, 2, 3] as any)).toThrow("Unsupported S3 Body type");
  });
  
});

describe("webStreamToNodeReadable", () => {
  it("should reject if web ReadableStream fails", async () => {
    const failingWebStream = new ReadableStream({
      start(controller) {
        setTimeout(() => {
          controller.error(new Error("Web stream error")); // Simulate an async failure
        }, 10);
      },
    });
  
    await expect(webStreamToNodeReadable(failingWebStream)).rejects.toThrow("Web stream error");
  });
  

  it("should reject if web ReadableStream fails", async () => {
    const failingWebStream = new ReadableStream({
      start(controller) {
        controller.error(new Error("Web stream error")); // Force an error
      },
    });
  
    await expect(webStreamToNodeReadable(failingWebStream)).rejects.toThrow("Web stream error");
  });

  it("should return an empty stream when web stream has no data", async () => {
    const emptyWebStream = new ReadableStream({
      start(controller) {
        controller.close();
      },
    });
  
    const nodeStream = await webStreamToNodeReadable(emptyWebStream);
    const result = await streamToString(nodeStream);
    expect(result).toBe("");
  });
});
