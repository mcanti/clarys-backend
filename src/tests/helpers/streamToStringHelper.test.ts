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
  mimicFsCreateReadStream,
  webStreamToNodeReadable,
} from "../../helpers/streamToStringHelper";

import { Readable, PassThrough } from "stream";
import { GetObjectCommandOutput } from "@aws-sdk/client-s3";

describe("streamToString", () => {
  it("should convert a readable stream to a string", async () => {
    const stream = Readable.from("Hello, world!");
    const result = await streamToString(stream);
    expect(result).toBe("Hello, world!");
  });

  it("should return an empty string for an empty stream", async () => {
    const stream = Readable.from("");
    const result = await streamToString(stream);
    expect(result).toBe("");
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
});

describe("ensureReadableStream", () => {
  it("should return the same readable stream if already readable", () => {
    const stream = Readable.from("Stream data");
    expect(ensureReadableStream(stream)).toBe(stream);
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
});

describe("mimicFsCreateReadStream", () => {
  it("should mimic fs.createReadStream", async () => {
    const stream = Readable.from("Mimic stream");
    const fsStream = mimicFsCreateReadStream(stream, "/fake/path.txt");

    expect(fsStream).toBeInstanceOf(PassThrough);
    expect((fsStream as any).path).toBe("/fake/path.txt");
    expect(await streamToString(fsStream)).toBe("Mimic stream");
  });
});

describe("webStreamToNodeReadable", () => {
  it("should convert a web ReadableStream to a Node.js Readable", async () => {
    const webStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("Web stream"));
        controller.close();
      },
    });

    const nodeStream = await webStreamToNodeReadable(webStream);
    expect(await streamToString(nodeStream)).toBe("Web stream");
  });
});
