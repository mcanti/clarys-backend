import { jsonToBlob, fileToBlob } from "../../helpers/jsonConvertor.helper";

describe("jsonToBlob", () => {
  it("should return a Blob object with correct type", () => {
    const jsonObject = { name: "John", age: 30 };
    const blob = jsonToBlob(jsonObject);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/json");
  });

  it("should return a Blob containing the correct JSON string", async () => {
    const jsonObject = { message: "Hello, world!" };
    const blob = jsonToBlob(jsonObject);

    const text = await blob.text(); // Read the Blob as text
    expect(text).toBe(JSON.stringify(jsonObject));
  });
});

describe("fileToBlob", () => {
  it("should return a Blob object from a file", () => {
    const fileContent = "Sample text content";
    const blob = fileToBlob(fileContent);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("string"); // typeof "Sample text content" is string
  });

  it("should return a Blob with correct type for Buffer", () => {
    const bufferContent = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" in ASCII
    const blob = fileToBlob(bufferContent);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("object"); // typeof Uint8Array is object
  });

  it("should return a Blob with correct type for an ArrayBuffer", () => {
    const arrayBuffer = new ArrayBuffer(8);
    const blob = fileToBlob(arrayBuffer);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("object"); // typeof ArrayBuffer is object
  });
});
