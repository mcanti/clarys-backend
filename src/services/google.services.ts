import { Readable } from "stream";
import { google, drive_v3 } from "googleapis";
import { injectable, inject } from "inversify";
import { Stream } from "stream";
import { GoogleAPIConfigInterface } from "../interfaces/google.interfaces";
import { AwsStorageService } from "./awsStorage.service";
import { FileService } from "./file.service";
import axios from "axios";
import * as cheerio from "cheerio";

import { readFileSync } from "fs";
import https from "https";

let agent = new https.Agent({
  rejectUnauthorized: false,
});

// if (process.env.NODE_ENV === "development") {
//   const certs = [readFileSync("./Zscaler_Root_CA.pem")];

//   agent = new https.Agent({
//     rejectUnauthorized: true,
//     ca: certs,
//   });
// }

const SERVICE_ACCOUNT_FILE = "./polkadot-440407-afc15f4b2e56.json";
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

@injectable()
export class GoogleServices {
  constructor(
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("FileService") private fileService: FileService
  ) {}

  async authenticateGoogleDrive(): Promise<drive_v3.Drive> {
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: SCOPES,
    });
    return google.drive({ version: "v3", auth });
  }

  private async streamToBuffer(stream: Stream): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  async uploadGoogleDocToS3(fileId: string, folderDocs: string): Promise<void> {
    try {
      const exportUrl = `https://docs.google.com/document/d/${fileId}/export?format=docx`;
      const response = await axios.get(exportUrl, {
        responseType: "stream",
        httpsAgent: agent,
      });
  
      if (response.status !== 200) {
        throw new Error(
          `Failed to download file, status code: ${response.status}`
        );
      }
  
      console.log("Google File found, fileId:", fileId);
  
      const fileStream = new Stream.PassThrough();
      response.data.pipe(fileStream);
  
      const bufferDoc = await this.streamToBuffer(fileStream);
  
      await this.awsStorageService.uploadFilesToS3(
        bufferDoc,
        `${folderDocs}/${fileId}.docx`,
        "application/docx"
      );
    } catch (error: any) {
      console.error("Error failed to download file and uploading it:", error);
      throw new Error("Download failed");
    }
  }  

  async scrapeGoogleDriveFolder(
    url: string
  ): Promise<{ name: string; downloadUrl: string }[]> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const files: { name: string; downloadUrl: string }[] = [];

      // Parse file links
      $("a").each((_, el) => {
        const link = $(el).attr("href");
        const text = $(el).text();

        if (link && link.includes("drive.google.com")) {
          files.push({
            name: text.trim(),
            downloadUrl: link,
          });
        }
      });

      return files;
    } catch (error) {
      console.error("Error scraping Google Drive folder:", error);
      return [];
    }
  }

  async downloadFile(fileUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(fileUrl, {
        responseType: "stream",
        httpsAgent: agent
      });

      const fileStream = new Stream.PassThrough();
      response.data.pipe(fileStream);

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        fileStream.on("data", (chunk) => chunks.push(chunk));
        fileStream.on("end", () => resolve(Buffer.concat(chunks)));
        fileStream.on("error", reject);
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      throw error;
    }
  }

  async processGoogleDriveFolder(
    folderUrl: string,
    s3FolderPath: string
  ): Promise<void> {
    try {
      const files = await this.scrapeGoogleDriveFolder(folderUrl);

      for (const file of files) {
        if (file.downloadUrl.includes("/folders/")) {
          // If it's a folder, process recursively
          console.log(`Processing subfolder: ${file.name}`);
          await this.processGoogleDriveFolder(
            file.downloadUrl,
            `${s3FolderPath}/${file.name}`
          );
        } else {
          // Download and upload file
          console.log(`Processing file: ${file.name}`);
          const fileBuffer = await this.downloadFile(file.downloadUrl);

          await this.awsStorageService.uploadFilesToS3(
            fileBuffer,
            `${s3FolderPath}/${file.name}.docx`,
            "application/octet-stream"
          );
        }
      }
    } catch (error) {
      console.error("Error processGoogleDriveFolder:", error);
    }
  }

  async processFilesFromFolder(folderId: string, folder: string): Promise<void> {
    const drive = await this.authenticateGoogleDrive();

    try {
      const res = await drive.files.list({
        q: `'${folderId}' in parents`,
        fields: "files(id, name, mimeType)",
      });

      const files = res.data.files;
      

      if (!files || files.length === 0) {
        console.log("No files found in the folder.");
        return;
      }

      for (const file of files) {
        const fileId = file.id!;
        let fileName = file.name!;
        const mimeType = file.mimeType!;

        console.log(`Processing ${fileName}...`);

        let downloadStream: Readable;

        try {
          if (mimeType.startsWith("application/vnd.google-apps.")) {
            // Export Google Docs files to PDF
            const exportMimeType = "application/docx";
            const exportRes = await drive.files.export(
              { fileId, mimeType: exportMimeType },
              { responseType: "stream" }
            );
            downloadStream = exportRes.data as Readable;
            fileName += ".docx"; // Append the correct file extension
          } else {
            // Download binary files directly
            const downloadRes = await drive.files.get(
              { fileId, alt: "media" },
              { responseType: "stream" }
            );
            downloadStream = downloadRes.data as Readable;
          }
          const chunks = [];

          for await (const chunk of downloadStream) {
            chunks.push(chunk);
          }
          
          const fileBuffer = Buffer.concat(chunks);
          // Upload to S3
          await this.awsStorageService.uploadFilesToS3(
            fileBuffer,
            `${folder}${fileName}`,
            "application/docx"
          );

        } catch (error) {
          console.error(`Failed to process ${fileName}:`, error);
        }
      }
    } catch (error) {
      console.error("Error fetching files from Google Drive folder:", error);
    }
  }
}
