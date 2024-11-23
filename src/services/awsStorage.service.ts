import { injectable } from "inversify";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  PutObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { Readable, Stream } from "stream";
import https from "https";
import { readFileSync } from "fs";
import * as process from "process";

import { streamToString } from "../helpers/streamToStringHelper";
import { Config } from "../config/config";
import { ListOnChainPostsResponseInterface } from "../interfaces/s3.interfaces";

if (!process.env.AWS_ACCESS_KEY_ID) {
  throw Error("AWS_ACCESS_KEY_ID missing");
}

if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw Error("AWS_ACCESS_KEY_ID missing");
}

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
export class AwsStorageService {
  private readonly s3: S3Client;
  private readonly s3Bucket: string;
  private readonly ttl: number;

  constructor() {
    const config = new Config().getConfig();
    this.s3Bucket = config.s3;
    this.s3 = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      requestHandler: new NodeHttpHandler({
        httpAgent: agent,
        httpsAgent: agent,
      }),
    });
    this.ttl = 3600;
  }

  async uploadFilesToS3(
    buffer: Buffer,
    key: string,
    type: string = "application/json"
  ): Promise<PutObjectCommandOutput> {
    const readable = new Stream.PassThrough();
    readable.end(buffer);

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.s3Bucket,
        Key: key,
        Body: readable,
        ContentType: type,
      },
    });

    return await upload.done();
  }

  async getFile(key: string): Promise<GetObjectCommandOutput> {
    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });

      const response: GetObjectCommandOutput = await this.s3.send(
        getObjectCommand
      );

      return response;
    } catch (err: any) {
      // console.error("Error in getFile: ", err);
      return null;
    }
  }

  async deleteFile(key: string): Promise<any> {
    try {
      const deleteObjectCommand = new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });

      return await this.s3.send(deleteObjectCommand);
    } catch (err) {
      console.error("Error in deleteFile: ", err);
      throw new Error(
        `Unable to retrieve file with key ${key}: ${err.message}`
      );
    }
  }

  async listFilesAndFolders(
    whatToList: string,
    prefix: string
  ): Promise<string[]> {
    try {
      const listObjectsCommand = new ListObjectsV2Command({
        Bucket: this.s3Bucket,
        Prefix: prefix,
        Delimiter: "/",
      });

      const response: ListObjectsV2CommandOutput = await this.s3.send(
        listObjectsCommand
      );

      if (whatToList === "files") {
        if (response.Contents) {
          const fileList = [];
          response.Contents.forEach((file) => {
            fileList.push(file.Key);
          });

          return fileList;
        }

        return [];
      }

      if (whatToList === "folders") {
        if (response?.CommonPrefixes) {
          const folderList = [];
          response.CommonPrefixes.forEach((folder) => {
            folderList.push(folder.Prefix);
          });

          return folderList;
        }

        return [];
      }
    } catch (err) {
      // console.error("Error in listFilesAndFolders: ", err);
      throw new Error(`Unable listFilesAndFolders`);
    }
  }
}
