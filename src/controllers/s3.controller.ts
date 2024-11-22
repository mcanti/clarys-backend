import { Request, Response } from "express";
import { inject } from "inversify";
import {
  BaseHttpController,
  controller,
  httpGet,
  httpPost,
  request,
  requestBody,
  requestParam,
  queryParam,
  response,
} from "inversify-express-utils";
import  { Document, Packer } from 'docx';

import { AwsStorageService } from "../services/awsStorage.service";
import { ResponseWrapperCode } from "../services/responseWrapper.service";

import { Readable } from "stream";
import { streamToString } from "../helpers/streamToStringHelper";

@controller("/api/s3")
export class S3Controller extends BaseHttpController {
  constructor(
    @inject("AwsStorageService") private awsStorageService: AwsStorageService
  ) {
    super();
  }

  async _s3UploadFiles(buffer: Buffer, key: string, type: string) {
    try {
      const response = await this.awsStorageService.uploadFilesToS3(
        buffer,
        key,
        type
      );

      return response;
    } catch (err) {
      console.error("Error - _s3UploadFiles: ", err);
      throw Error("_s3UploadFiles failed");
    }
  }

  async _s3GetFile(key: string) {
    try {

      const response = await this.awsStorageService.getFile(key);

      if (response && !response.Body) {
        return `File with key ${key} not found in S3`;
      }

      if (key.includes("docx")) {

        if (response.Body instanceof Readable) {
          const chunks = [];

          for await (const chunk of response.Body) {
            chunks.push(chunk);
          }
          
          const fileBuffer = Buffer.concat(chunks);
          return fileBuffer;
        } else {
          throw new Error("data.Body is not a readable stream.");
        }
        

        return response;
      } else{

        const jsonData = await streamToString(response.Body as Readable);
        const parsedData = JSON.parse(jsonData);
  
        return parsedData;
      }
      
    } catch (err) {
      console.error("Error - _s3GetFile: ", err);
      return null;
    }
  }

  async _s3ListFilesAndFolders(objectType: string, prefix: string) {
    try {
      const response = await this.awsStorageService.listFilesAndFolders(
        objectType,
        prefix
      );

      return response;
    } catch (err) {
      // console.error("Error - _s3ListFilesAndFolders: ", err);
      return null;
    }
  }

  // Exposing API endpoints

  /**
   * @swagger
   * /api/s3/s3UploadFiles:
   *   post:
   *     tags:
   *       - S3
   *     summary: Upload files to S3
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               buffer:
   *                 type: string
   *                 format: binary
   *                 description: The file buffer to upload
   *               key:
   *                 type: string
   *                 description: The key under which to store the file in S3
   *               type:
   *                 type: string
   *                 description: The MIME type of the file
   *     responses:
   *       200:
   *         description: Successfully uploaded the file
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Internal server error
   */
  @httpPost("/s3UploadFiles")
  async s3UploadFiles(
    @request() req: Request,
    @response() res: Response,
    @requestBody()
    params: {
      buffer: Buffer;
      key: string;
      type: string;
    }
  ) {
    try {
      const uploadResponse = await this._s3UploadFiles(
        params.buffer,
        params.key,
        params.type
      );

      return res.apiSuccess({
        message: "File successfully uploaded to S3",
        data: uploadResponse,
      });
    } catch (err) {
      console.error("Error - s3UploadFiles: ", err);

      const ErrorResponse = ResponseWrapperCode.generalError;
      ErrorResponse.message = `Failed to upload file to S3: ${err.message}`;
      return res.apiError(ErrorResponse);
    }
  }

  /**
   * @swagger
   * /api/s3/s3GetFile/{key}:
   *   get:
   *     tags:
   *       - S3
   *     summary: Get a file from S3
   *     parameters:
   *       - name: key
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *         description: The key of the file to retrieve from S3
   *     responses:
   *       200:
   *         description: Successfully retrieved the file
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: File not found
   *       500:
   *         description: Internal server error
   */
  @httpGet("/s3GetFile")
  async s3GetFile(@response() res: Response, @queryParam("key") key: string) {
    try {
      const response = await this._s3GetFile(key);

      const docName = key.split('/');

      if(key.includes('docx')){
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=${docName[docName.length-1]}`);
      }

      

      if (typeof response === "string") {
        const ErrorResponse = ResponseWrapperCode.missingItem;
        ErrorResponse.message = response;
        return res.apiError(ErrorResponse);
      }

      return res.apiSuccess(response);
    } catch (err) {
      console.error("Error - getFileFromS3: ", err);

      const ErrorResponse = ResponseWrapperCode.generalError;
      ErrorResponse.message = `Failed to retrieve file from S3: ${err.message}`;
      return res.apiError(ErrorResponse);
    }
  }

  /**
   * @swagger
   * /api/s3/s3ListFilesAndFolders:
   *   get:
   *     tags:
   *       - S3
   *     summary: List files and folders from the bucket and the given path
   *     parameters:
   *       - name: objectType
   *         in: path
   *         required: false
   *         schema:
   *           type: string
   *         description: The object type you want to list file/folder
   *       - name: prefix
   *         in: path
   *         required: false
   *         schema:
   *           type: string
   *         description: The prefix path
   *     responses:
   *       200:
   *         description: Successfully retrieved the file
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string[]
   *               format: binary
   *       404:
   *         description: Files or folders not found
   *       500:
   *         description: Internal server error
   */
  @httpGet("/s3ListFilesAndFolders")
  async s3ListFilesAndFolders(
    @response() res: Response,
    @queryParam("objectType") objectType?: string,
    @queryParam("prefix") prefix?: string
  ) {
    try {
      const response = await this._s3ListFilesAndFolders(
        objectType ? objectType : "files",
        prefix ? prefix : ""
      );

      return res.apiSuccess(response);
    } catch (err) {
      console.error("Error - s3ListFilesAndFolders: ", err);

      const ErrorResponse = ResponseWrapperCode.generalError;
      ErrorResponse.message = `Failed to list files an folders: ${err.message}`;
      return res.apiError(ErrorResponse);
    }
  }

  /**
   * @swagger
   * /api/s3/deleteS3File:
   *   get:
   *     tags:
   *       - S3
   *     summary: Get a file from S3
   *     parameters:
   *       - name: key
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *         description: The key of the file to retrieve from S3
   *     responses:
   *       200:
   *         description: Successfully retrieved the file
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: File not found
   *       500:
   *         description: Internal server error
   */
  @httpGet("/deleteS3File")
  async deleteS3File(
    @response() res: Response,
    @queryParam("key") key: string
  ) {
    try {
      const response = await this.awsStorageService.deleteFile(key);

      res.apiSuccess(response);
    } catch (err) {
      console.error("Error - deleteS3File: ", err);

      const ErrorResponse = ResponseWrapperCode.generalError;
      ErrorResponse.message = `Failed to delete file from S3: ${err.message}`;
      return res.apiError(ErrorResponse);
    }
  }
}
