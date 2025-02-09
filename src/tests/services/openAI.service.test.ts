import { OpenAIService } from "../../services/openAI.service";
import { OpenAI } from "openai";

jest.mock("openai");

describe("OpenAIService", () => {
  let openAIService: OpenAIService;
  let mockOpenAIInstance: jest.Mocked<OpenAI>;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-api-key";
    process.env.OPENAI_ORGANIZATION_ID = "test-org-id";
    process.env.OPENAI_PROJECT_ID = "test-project-id";
    process.env.VECTOR_STORE_ID = "test-vector-store-id";

    mockOpenAIInstance = {
        files: {
          retrieve: jest.fn().mockResolvedValue({
            id: "file-123",
            object: "file",
          }),
          list: jest.fn().mockResolvedValue({
            data: [{ id: "file-1" }, { id: "file-2" }],
          }),
        },
        beta: {
          vectorStores: {
            files: {
              list: jest.fn().mockResolvedValue({
                data: [{ id: "vector-file-1" }, { id: "vector-file-2" }],
              }),
              del: jest.fn().mockResolvedValue({ deleted: true }),
            },
            fileBatches: {
              uploadAndPoll: jest.fn().mockResolvedValue({
                status: "completed",
                files: ["file-1", "file-2"],
              }),
            },
          },
        },
      } as unknown as jest.Mocked<OpenAI>;

    // Inject mocked instance into service
    openAIService = new OpenAIService();
    (openAIService as any).openai = mockOpenAIInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Tests WITHOUT Mocking (Direct API Call) ---
  describe("Tests WITHOUT Mocking", () => {
    test("getFile should retrieve a file directly from API", async () => {
      const fileId = "file-123";
      const result = await openAIService.getFile(fileId);

      expect(mockOpenAIInstance.files.retrieve).toHaveBeenCalledWith(fileId);
      expect(result).toEqual({ id: "file-123", object: "file" });
    });

    test("getFile should return null if API call fails", async () => {
      (mockOpenAIInstance.files.retrieve as jest.Mock).mockRejectedValue(
        new Error("API Error")
      );

      const result = await openAIService.getFile("invalid-file-id");

      expect(result).toBeNull();
    });
  });

  // --- Tests WITH Mocking ---
  describe("Tests WITH Mocking", () => {
    test("listFiles should return a list of files", async () => {
      const params = { limit: 10 };
      const result = await openAIService.listFiles(params);

      expect(mockOpenAIInstance.files.list).toHaveBeenCalledWith(params);
      expect(result).toEqual({ data: [{ id: "file-1" }, { id: "file-2" }] });
    });

    test("listVectorStoreFiles should return a list of vector store files", async () => {
      const params = { limit: 5 };
      const result = await openAIService.listVectorStoreFiles(params);

      expect(
        mockOpenAIInstance.beta.vectorStores.files.list
      ).toHaveBeenCalledWith("test-vector-store-id", params);
      expect(result).toEqual({
        data: [{ id: "vector-file-1" }, { id: "vector-file-2" }],
      });
    });

    test("deleteVectorStoreFile should delete a vector store file", async () => {
      const fileId = "vector-file-1";
      await openAIService.deleteVectorStoreFile(fileId);

      expect(
        mockOpenAIInstance.beta.vectorStores.files.del
      ).toHaveBeenCalledWith("test-vector-store-id", fileId);
    });

    test("uploadFilesToOpenAIVectorStore should upload and poll files", async () => {
      const filesData = { files: ["file-1", "file-2"] };
      const result = await openAIService.uploadFilesToOpenAIVectorStore(
        filesData
      );

      expect(
        mockOpenAIInstance.beta.vectorStores.fileBatches.uploadAndPoll
      ).toHaveBeenCalledWith("test-vector-store-id", filesData);
      expect(result).toEqual({
        status: "completed",
        files: ["file-1", "file-2"],
      });
    });

    test("listFiles should return null if API call fails", async () => {
      (mockOpenAIInstance.files.list as jest.Mock).mockRejectedValue(new Error("API Error"));

      const result = await openAIService.listFiles({ limit: 10 });

      expect(result).toBeNull();
    });

    test("listVectorStoreFiles should return null if API call fails", async () => {
      (mockOpenAIInstance.beta.vectorStores.files.list as jest.Mock).mockRejectedValue(
        new Error("API Error")
      );

      const result = await openAIService.listVectorStoreFiles({ limit: 5 });

      expect(result).toBeNull();
    });

    test("deleteVectorStoreFile should return null if API call fails", async () => {
      (
        mockOpenAIInstance.beta.vectorStores.files.del as jest.Mock
      ).mockRejectedValue(new Error("API Error"));

      const result = await openAIService.deleteVectorStoreFile("vector-file-1");

      expect(result).toBeNull();
    });

    test("uploadFilesToOpenAIVectorStore should return null if API call fails", async () => {
      (
        mockOpenAIInstance.beta.vectorStores.fileBatches
          .uploadAndPoll as jest.Mock
      ).mockRejectedValue(new Error("API Error"));

      const result = await openAIService.uploadFilesToOpenAIVectorStore({
        files: ["file-1", "file-2"],
      });

      expect(result).toBeNull();
    });
  });
});
