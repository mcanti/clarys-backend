import { ListOnChainPostsResponseInterface, s3File } from "../../interfaces/s3.interfaces";

// Mock the module
jest.mock("../../interfaces/s3.interfaces", () => ({
  ListOnChainPostsResponseInterface: jest.fn<ListOnChainPostsResponseInterface, []>(() => ({
    count: 5,
    posts: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
  })),
  s3File: jest.fn<s3File, []>(() => ({
    Key: "mocked-file-key",
    LastModified: new Date("2024-02-01T12:00:00Z"),
    ETag: "mocked-etag",
    Size: 1024,
    StorageClass: "STANDARD",
  })),
}));

describe("Mocked ListOnChainPostsResponseInterface", () => {
  test("should create a mock response with predefined count and posts", () => {
    const mockResponse: ListOnChainPostsResponseInterface = {
      count: 5,
      posts: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
    };

    expect(mockResponse.count).toBe(5);
    expect(mockResponse.posts.length).toBe(5);
  });
});

describe("Mocked s3File Interface", () => {
  test("should create a mock s3File object", () => {
    const mockFile: s3File = {
      Key: "mocked-file-key",
      LastModified: new Date("2024-02-01T12:00:00Z"),
      ETag: "mocked-etag",
      Size: 1024,
      StorageClass: "STANDARD",
    };

    expect(mockFile.Key).toBe("mocked-file-key");
    expect(mockFile.LastModified?.toISOString()).toBe("2024-02-01T12:00:00.000Z");
    expect(mockFile.ETag).toBe("mocked-etag");
    expect(mockFile.Size).toBe(1024);
    expect(mockFile.StorageClass).toBe("STANDARD");
  });
});
