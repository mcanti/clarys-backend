import { injectable, inject } from "inversify";
import { google, drive_v3 } from "googleapis";
import { Stream } from "stream";
import { GoogleAPIConfigInterface } from "../interfaces/google.interfaces";
import { AwsStorageService } from "./awsStorage.service";
import axios from "axios";

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
    // @inject("GoogleAPIConfig") googleConfig: GoogleAPIConfigInterface,
    @inject("AwsStorageService") private awsStorageService: AwsStorageService
  ) {
    // const oAuth2Client = new google.auth.OAuth2(
    //   googleConfig.clientId,
    //   googleConfig.clientSecret,
    //   googleConfig.redirectUri
    // );
    // oAuth2Client.setCredentials({
    //   access_token: googleConfig.accessToken,
    // });
    // this.drive = google.drive({ version: "v3", auth: oAuth2Client });
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
      // const response = await this.drive.files.export(
      //   { fileId, mimeType: "application/pdf" },
      //   { responseType: "stream" }
      // );

      const exportUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
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
        `${folderDocs}/${fileId}.pdf`,
        "application/pdf"
      );

      console.log(`File from Google Docs uploaded to S3`);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }
}
