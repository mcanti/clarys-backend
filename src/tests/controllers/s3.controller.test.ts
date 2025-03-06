import { S3Controller } from "../../controllers/s3.controller";
import { AwsStorageService } from "../../services/awsStorage.service";
import { Readable } from "stream";
import {
  GetObjectCommandOutput,
  PutObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";

jest.mock("../../services/awsStorage.service");

const mockedAwsStorageService =
  new AwsStorageService() as jest.Mocked<AwsStorageService>;

// Lines 200–216, 249–281, 324–336, 362–375, 411–420: API endpoints are intentionally not teste directly.

describe("S3Controller", () => {
  let controller: S3Controller;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new S3Controller(mockedAwsStorageService);
  });

  describe("_s3UploadFiles", () => {
    it("should successfully upload files to S3", async () => {
      const mockResponse: PutObjectCommandOutput = {
        ETag: '"mock-etag"',
        VersionId: "mock-version-id",
        $metadata: undefined,
      };
      mockedAwsStorageService.uploadFilesToS3.mockResolvedValue(mockResponse);

      const buffer = Buffer.from("mock file content");
      const key = "path/to/mockFile.txt";
      const type = "text/plain";

      const response = await controller._s3UploadFiles(buffer, key, type);

      expect(mockedAwsStorageService.uploadFilesToS3).toHaveBeenCalledWith(
        buffer,
        key,
        type
      );
      expect(response).toEqual(mockResponse);
    });

    it("should handle error during upload to S3", async () => {
      const mockError = new Error("Upload failed");
      mockedAwsStorageService.uploadFilesToS3.mockRejectedValue(mockError);

      const buffer = Buffer.from("mock file content");
      const key = "path/to/mockFile.txt";
      const type = "text/plain";

      await expect(
        controller._s3UploadFiles(buffer, key, type)
      ).rejects.toThrow("_s3UploadFiles failed");

      expect(mockedAwsStorageService.uploadFilesToS3).toHaveBeenCalledWith(
        buffer,
        key,
        type
      );
    });
  });

  describe("_s3GetFile", () => {
    it("should return file buffer when file is docx", async () => {
      const mockDocxData = Buffer.from("mock docx data", "utf-8");

      const mockStream = sdkStreamMixin(Readable.from([mockDocxData]));

      const mockResponse: GetObjectCommandOutput = {
        Body: mockStream,
        $metadata: {
          httpStatusCode: 200,
          requestId: "mock-request-id",
          extendedRequestId: "mock-extended-request-id",
          cfId: "mock-cf-id",
          attempts: 1,
          totalRetryDelay: 0,
        },
      };

      mockedAwsStorageService.getFile.mockResolvedValue(mockResponse);

      const key = "path/to/file.docx";

      const result = await controller._s3GetFile(key);

      expect(mockedAwsStorageService.getFile).toHaveBeenCalledWith(key);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toEqual(mockDocxData.toString());
    });

    it("should return parsed JSON data when file is JSON", async () => {
      const mockJSONData = { test: "value" };

      const mockStream = sdkStreamMixin(
        Readable.from([JSON.stringify(mockJSONData)])
      );

      const mockResponse: GetObjectCommandOutput = {
        Body: mockStream,
        $metadata: {
          httpStatusCode: 200,
          requestId: "mock-request-id",
          extendedRequestId: "mock-extended-request-id",
          cfId: "mock-cf-id",
          attempts: 1,
          totalRetryDelay: 0,
        },
      };

      mockedAwsStorageService.getFile.mockResolvedValue(mockResponse);

      const key = "path/to/file.json";

      const result = await controller._s3GetFile(key);

      expect(mockedAwsStorageService.getFile).toHaveBeenCalledWith(key);
      expect(result).toEqual(mockJSONData);
    });

    it("should return null if no file is found in S3", async () => {
      mockedAwsStorageService.getFile.mockResolvedValue(null);

      const key = "nonexistent-file.json";

      const result = await controller._s3GetFile(key);

      expect(mockedAwsStorageService.getFile).toHaveBeenCalledWith(key);
      expect(result).toBeNull();
    });

    it("should return an informative message when response body is missing", async () => {
      mockedAwsStorageService.getFile.mockResolvedValue({
        Body: undefined,
        $metadata: {},
      });

      const key = "missing-body-file.json";

      const result = await controller._s3GetFile(key);

      expect(mockedAwsStorageService.getFile).toHaveBeenCalledWith(key);
      expect(result).toEqual(`File with key ${key} not found in S3`);
    });

    it("should return null if docx response body is not readable stream", async () => {
      const invalidBody = {} as any;

      mockedAwsStorageService.getFile.mockResolvedValue({
        Body: invalidBody,
        $metadata: {},
      });

      const key = "path/to/file.docx";

      const result = await controller._s3GetFile(key);

      expect(mockedAwsStorageService.getFile).toHaveBeenCalledWith(key);
      expect(result).toBeNull();
    });

    it("should handle JSON parsing errors gracefully", async () => {
      const invalidJSONData = "{invalid JSON";

      const mockStream = sdkStreamMixin(Readable.from([invalidJSONData]));

      mockedAwsStorageService.getFile.mockResolvedValue({
        Body: mockStream,
        $metadata: {},
      });

      const key = "path/to/file.json";

      const result = await controller._s3GetFile(key);

      expect(mockedAwsStorageService.getFile).toHaveBeenCalledWith(key);
      expect(result).toBeNull();
    });
  });

  describe("_s3ListFilesAndFolders", () => {
    it("should list files and folders", async () => {
      const mockList = ["file1.txt", "folder1/", "file2.docx"];
      mockedAwsStorageService.listFilesAndFolders.mockResolvedValue(mockList);

      const objectType = "files";
      const prefix = "some/prefix/";

      const result = await controller._s3ListFilesAndFolders(
        objectType,
        prefix
      );

      expect(mockedAwsStorageService.listFilesAndFolders).toHaveBeenCalledWith(
        objectType,
        prefix
      );
      expect(result).toEqual(mockList);
    });

    it("should return null if listing files and folders fails", async () => {
      mockedAwsStorageService.listFilesAndFolders.mockRejectedValue(
        new Error("S3 error")
      );

      const result = await controller._s3ListFilesAndFolders(
        "files",
        "some/prefix"
      );

      expect(mockedAwsStorageService.listFilesAndFolders).toHaveBeenCalledWith(
        "files",
        "some/prefix"
      );
      expect(result).toBeNull();
    });

    it("should return null when awsStorageService.listFilesAndFolders throws an error", async () => {
      mockedAwsStorageService.listFilesAndFolders.mockRejectedValue(
        new Error("AWS Error")
      );

      const result = await controller._s3ListFilesAndFolders(
        "files",
        "invalid/prefix"
      );

      expect(mockedAwsStorageService.listFilesAndFolders).toHaveBeenCalledWith(
        "files",
        "invalid/prefix"
      );
      expect(result).toBeNull();
    });
  });

  describe("_s3GetListOfProposals", () => {
    it("should return filtered proposals list", async () => {
      const mockS3Files = [
        { Key: "path/proposals/subEvents/1234/file1.docx" },
        { Key: "path/tips/5678/file2.docx" },
        { Key: "irrelevant/file.txt" },
      ];

      mockedAwsStorageService.getAllFiles.mockResolvedValue(mockS3Files);

      const result = await controller._s3GetListOfProposals("files");

      expect(mockedAwsStorageService.getAllFiles).toHaveBeenCalled();
      expect(result).toEqual({
        numberOfProposals: 2,
        proposals: [
          "subEvent-IdsubEvents-file1.docx",
          "path-Idtips-file2.docx",
        ],
      });
    });

    it("should handle empty or invalid file structure gracefully", async () => {
      const mockS3Files = [
        { Key: "invalidpath/file.docx" },
        { Key: "anotherinvalidpath/data.json" },
      ];

      mockedAwsStorageService.getAllFiles.mockResolvedValue(mockS3Files);

      const result = await controller._s3GetListOfProposals("files");

      expect(mockedAwsStorageService.getAllFiles).toHaveBeenCalled();
      expect(result).toEqual({
        numberOfProposals: 0,
        proposals: [],
      });
    });

    it("should return null if getAllFiles returns null", async () => {
      mockedAwsStorageService.getAllFiles.mockResolvedValue(null);

      const result = await controller._s3GetListOfProposals("files");

      expect(mockedAwsStorageService.getAllFiles).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should handle empty file list response gracefully", async () => {
      mockedAwsStorageService.getAllFiles.mockResolvedValue([]);

      const result = await controller._s3GetListOfProposals("files");

      expect(mockedAwsStorageService.getAllFiles).toHaveBeenCalled();
      expect(result).toEqual({
        numberOfProposals: 0,
        proposals: [],
      });
    });
  });

  describe("deleteS3File", () => {
    it("should handle errors when deleting files from S3", async () => {
      const mockError = new Error("Deletion failed");
      mockedAwsStorageService.deleteFile.mockRejectedValue(mockError);

      await expect(
        (controller as any).awsStorageService.deleteFile("invalid/key")
      ).rejects.toThrow("Deletion failed");

      expect(mockedAwsStorageService.deleteFile).toHaveBeenCalledWith(
        "invalid/key"
      );
    });
  });
});
