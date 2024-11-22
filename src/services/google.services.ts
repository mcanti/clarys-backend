import { injectable, inject } from "inversify";
import { google, drive_v3 } from "googleapis";
import { Stream } from "stream";
import { GoogleAPIConfigInterface } from "../interfaces/google.interfaces";
import { AwsStorageService } from "./awsStorage.service";
import { FileService } from "./file.service";
import axios from "axios";
import * as cheerio from "cheerio";

import { readFileSync } from "fs";
import https from "https";

let agent = new https.Agent({
  rejectUnauthorized: true,
});

if (process.env.NODE_ENV === "development") {
  const certs = [readFileSync("./Zscaler_Root_CA.pem")];

  agent = new https.Agent({
    rejectUnauthorized: true,
    ca: certs,
  });
}

@injectable()
export class GoogleServices {
  private drive: drive_v3.Drive;

  constructor(
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("FileService") private fileService: FileService
  ) {}

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
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // Ignore SSL certificate errors
        }),
      });

      if (response.status !== 200) {
        throw new Error(
          `Failed to download file, status code: ${response.status}`
        );
      }

      const fileStream = new Stream.PassThrough();
      response.data.pipe(fileStream);

      const bufferDoc = await this.streamToBuffer(fileStream);

      await this.awsStorageService.uploadFilesToS3(
        bufferDoc,
        `${folderDocs}/${fileId}.docx`,
        "application/docx"
      );

      // await this.fileService.saveDataToFile(
      //   `${folderDocs}/${fileId}.docx`,
      //   bufferDoc,
      //   true
      // );

    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }

  async scrapeGoogleDriveFolder(url: string): Promise<{ name: string; downloadUrl: string }[]> {
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
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
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
  
  async processGoogleDriveFolder(folderUrl: string, s3FolderPath: string): Promise<void> {
    try{

      const files = await this.scrapeGoogleDriveFolder(folderUrl);
  
      for (const file of files) {
        if (file.downloadUrl.includes("/folders/")) {
          // If it's a folder, process recursively
          console.log(`Processing subfolder: ${file.name}`);
          await this.processGoogleDriveFolder(file.downloadUrl, `${s3FolderPath}/${file.name}`);
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

    }catch (error) {
      console.error("Error processGoogleDriveFolder:", error);
    }
   
  }
  
}
