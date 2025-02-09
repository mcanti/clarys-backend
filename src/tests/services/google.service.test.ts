import "reflect-metadata";
import { GoogleServices } from "../../services/google.services";
import { AwsStorageService } from "../../services/awsStorage.service";
import { FileService } from "../../services/file.service";
import { Readable } from "stream";
import axios from "axios";
import { google } from "googleapis";

jest.mock("axios");

const mockAwsStorageService = {
  uploadFilesToS3: jest.fn(),
};

const mockFileService = {};

describe("GoogleServices", () => {
  let googleServices: GoogleServices;

  beforeEach(() => {
    googleServices = new GoogleServices(
      mockAwsStorageService as unknown as AwsStorageService,
      mockFileService as unknown as FileService
    );
  });

  test("should authenticate Google Drive", async () => {
    const authMock = {
      getClient: jest.fn().mockResolvedValue({}),
    };
    jest.spyOn(google.auth, "GoogleAuth").mockReturnValue(authMock as any);
    
    const drive = await googleServices.authenticateGoogleDrive();
    expect(drive).toBeDefined();
  });

  test("should stream a buffer from a Readable stream", async () => {
    const readable = new Readable();
    const testData = Buffer.from("test data");
    readable.push(testData);
    readable.push(null);

    const result = await (googleServices as any).streamToBuffer(readable);
    expect(result).toEqual(testData);
  });

  test("should upload Google Doc to S3", async () => {
    const fileId = "test-file-id";
    const folderDocs = "test-folder";
    const mockResponse = { status: 200, data: Readable.from("test doc data") };
    
    (axios.get as jest.Mock).mockResolvedValue(mockResponse);

    await googleServices.uploadGoogleDocToS3(fileId, folderDocs);

    expect(mockAwsStorageService.uploadFilesToS3).toHaveBeenCalled();
  });

  test("should handle Google Doc download failure", async () => {
    const fileId = "test-file-id";
    const folderDocs = "test-folder";
    (axios.get as jest.Mock).mockResolvedValue({ status: 404 });

    await expect(
      googleServices.uploadGoogleDocToS3(fileId, folderDocs)
    ).rejects.toThrow();
  });

  test("should scrape Google Drive folder", async () => {
    const mockHtml = `<a href="https://drive.google.com/file/d/1">File1</a>`;
    (axios.get as jest.Mock).mockResolvedValue({ data: mockHtml });

    const files = await googleServices.scrapeGoogleDriveFolder("https://drive.google.com/folder");

    expect(files).toEqual([{ name: "File1", downloadUrl: "https://drive.google.com/file/d/1" }]);
  });

  test("should process files from Google Drive folder", async () => {
    const mockDriveFiles = { data: { files: [{ id: "1", name: "test.docx", mimeType: "application/vnd.google-apps.document" }] } };
    const mockStream = Readable.from("mock file data");
    
    jest.spyOn(google.auth, "GoogleAuth").mockReturnValue({ getClient: jest.fn() } as any);
    jest.spyOn(google, "drive").mockReturnValue({
        files: {
          list: jest.fn().mockResolvedValue(mockDriveFiles),
          export: jest.fn().mockResolvedValue({ data: mockStream }),
        },
      } as any);
      
    await googleServices.processFilesFromFolder("test-folder-id", "test-folder");

    expect(mockAwsStorageService.uploadFilesToS3).toHaveBeenCalled();
  });
});
