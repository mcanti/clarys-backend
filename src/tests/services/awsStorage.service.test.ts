import { AwsStorageService } from "../../services/awsStorage.service";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

jest.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: jest.fn(() => ({
      send: jest.fn(),
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    ListObjectsV2Command: jest.fn(),
  };
});

jest.mock("@aws-sdk/lib-storage", () => {
  return {
    Upload: jest.fn(() => ({
      done: jest.fn().mockResolvedValue({}),
    })),
  };
});

describe("AwsStorageService", () => {
  let awsStorageService;
  let mockSend;

  beforeAll(() => {
    process.env.AWS_ACCESS_KEY_ID = "fake-access-key";
    process.env.AWS_SECRET_ACCESS_KEY = "fake-secret-key";
  });

  afterAll(() => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  beforeEach(() => {
    awsStorageService = new AwsStorageService();
    mockSend = awsStorageService.s3.send;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should upload file to S3", async () => {
    const buffer = Buffer.from("test content");
    const key = "test-key";
    
    const response = await awsStorageService.uploadFilesToS3(buffer, key);
    
    expect(Upload).toHaveBeenCalled();
    expect(response).toEqual({});
  });

  test("should retrieve file from S3", async () => {
    const key = "test-key";
    const mockResponse = { Body: "mock body" };
    mockSend.mockResolvedValue(mockResponse);

    const response = await awsStorageService.getFile(key);
    
    expect(mockSend).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    expect(response).toEqual(mockResponse);
  });

  test("should delete file from S3", async () => {
    const key = "test-key";
    mockSend.mockResolvedValue({});
    
    const response = await awsStorageService.deleteFile(key);
    
    expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    expect(response).toEqual({});
  });

  test("should list files in S3", async () => {
    const mockResponse = { Contents: [{ Key: "file1" }, { Key: "file2" }] };
    mockSend.mockResolvedValue(mockResponse);

    const response = await awsStorageService.listFilesAndFolders("files", "");
    
    expect(mockSend).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
    expect(response).toEqual(["file1", "file2"]);
  });
});
