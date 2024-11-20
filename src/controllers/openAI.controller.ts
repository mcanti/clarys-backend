import { inject } from "inversify";
import express, { Request, Response } from "express";
import multer from "multer";

import {
  BaseHttpController,
  controller,
  httpPost,
  httpGet,
  response,
  queryParam,
  requestBody,
} from "inversify-express-utils";
import { AwsStorageService } from "../services/awsStorage.service";
import { OpenAIService } from "../services/openAI.service";
import { ResponseWrapperCode } from "../services/responseWrapper.service";

import { jsonToBlob } from "../helpers/jsonConvertor.helper";

// const upload = multer();

@controller("/api/openAI")
export class OpenAIController extends BaseHttpController {
  constructor(
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("OpenAIService") private openAIService: OpenAIService
  ) {
    super();
  }

  async _listFiles(
    purpose?: string,
    limit?: number,
    order?: string,
    after?: string
  ) {
    try {
      const response = await this.openAIService.listFiles({
        purpose,
        limit,
        order,
        after,
      });

      return response;
    } catch (err) {
      console.log("Error - _listFiles: ", err);
      throw new Error(`_listFiles failed: ${err.message || "Unknown error"}`);
    }
  }

  async _getFile(file_id: string) {
    try {
      const response = await this.openAIService.getFile({
        file_id,
      });

      return response;
    } catch (err) {
      console.log("Error - _getFile: ", err);
      throw Error("_getFile failed");
    }
  }

  async _getFileContent(file_id: string) {
    try {
      const response = await this.openAIService.getFileContent({
        file_id,
      });

      return response.data;
    } catch (err) {
      console.log("Error - getFileContent: ", err);
      throw Error("getFileContent failed");
    }
  }

  async _deleteFile(file_id: string) {
    try {
      const response = await this.openAIService.deleteFile({ file_id });
      return response;
    } catch (err) {
      console.log("Error - _deleteFile: ", err);
      throw new Error(`_deleteFile failed: ${err.message || "Unknown error"}`);
    }
  }

  async _uploadFile(purpose: string, file: File, filename: string) {
    try {
      const response = await this.openAIService.uploadFile({
        purpose,
        file,
        filename,
      });
      return response;
    } catch (err) {
      console.log("Error - _uploadFile: ", err);
      throw new Error(`_uploadFile failed: ${err.message || "Unknown error"}`);
    }
  }

  async _createVectorStoreFile(file_id: string) {
    try {
      const response = await this.openAIService.createVectorStoreFile({
        file_id,
      });
      return response;
    } catch (err) {
      console.log("Error - _createVectorStoreFile: ", err);
      throw new Error(
        `_createVectorStoreFile failed: ${err.message || "Unknown error"}`
      );
    }
  }

  async _createVectorStoreFilesBatch(file_ids: string[]) {
    try {
      const response = await this.openAIService.createVectorStoreFilesBatch({
        file_ids,
      });
      return response;
    } catch (err) {
      console.log("Error - _createVectorStoreFilesBatch: ", err);
      throw new Error(
        `_createVectorStoreFilesBatch failed: ${err.message || "Unknown error"}`
      );
    }
  }

  async _listVectorStoreFiles(
    limit: number,
    order?: string,
    after?: string,
    before?: string,
    filter?: string
  ) {
    try {
      const response = await this.openAIService.listVectorStoreFiles({
        limit,
        order,
        after,
        before,
        filter,
      });

      return response;
    } catch (err) {
      console.log("Error - _listVectorStoreFiles: ", err);
      throw new Error(
        `_listVectorStoreFiles failed: ${err.message || "Unknown error"}`
      );
    }
  }

  async _deleteVectorStoreFile(file_id: string) {
    try {
      const response = await this.openAIService.deleteVectorStoreFile({
        file_id,
      });
      return response;
    } catch (err) {
      console.log("Error - _deleteVectorStoreFile: ", err);
      throw new Error(
        `_deleteVectorStoreFile failed: ${err.message || "Unknown error"}`
      );
    }
  }

  // Exposing API endpoints

  /**
   * @swagger
   * /api/openAI/listFiles:
   *   get:
   *     tags:
   *       - OpenAI
   *     summary: List files from openAI
   *     parameters:
   *       - name: purpose
   *         in: query
   *         required: false
   *         description: Only return files with the given purpose.
   *         schema:
   *           type: string
   *       - name: limit
   *         in: query
   *         required: false
   *         description: A limit on the number of objects to be returned. Limit can range between 1 and 10,000, and the default is 10,000.
   *         schema:
   *           type: number
   *       - name: order
   *         in: query
   *         required: false
   *         description: Sort order by the created_at timestamp of the objects. asc for ascending order and desc for descending order.
   *         schema:
   *           type: string
   *       - name: after
   *         in: query
   *         required: false
   *         description: A cursor for use in pagination. after is an object ID that defines your place in the list. For instance, if you make a list request and receive 100 objects, ending with obj_foo, your subsequent call can include after=obj_foo in order to fetch the next page of the list.
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully retrieved list of files
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Internal server error
   */
  @httpGet("/listFiles")
  async listFiles(
    @response() res: Response,
    @queryParam("purpose") purpose?: string,
    @queryParam("limit") limit?: number,
    @queryParam("order") order?: string,
    @queryParam("after") after?: string
  ) {
    try {
      const result = await this._listFiles(purpose, limit, order, after);

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - listFiles: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }

  /**
   * @swagger
   * /api/openAI/getFile:
   *   get:
   *     tags:
   *       - OpenAI
   *     summary: Returns information about a specific file.
   *     parameters:
   *       - name: file_id
   *         in: query
   *         required: true
   *         description: The ID of the file to use for this request.
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully retrieved file object matching the specified ID.
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Internal server error
   */
  @httpGet("/getFile")
  async getFile(
    @response() res: Response,
    @queryParam("file_id") file_id: string
  ) {
    try {
      const result = await this._getFile(file_id);

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - getFile: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }

  /**
   * @swagger
   * /api/openAI/getFileContent:
   *   get:
   *     tags:
   *       - OpenAI
   *     summary: Returns the contents of the specified file
   *     parameters:
   *       - name: file_id
   *         in: query
   *         required: true
   *         description: The ID of the file to use for this request.
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully retrieved the file content.
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Internal server error
   */
  @httpGet("/getFileContent")
  async getFileContent(
    @response() res: Response,
    @queryParam("file_id") file_id: string
  ) {
    try {
      const result = await this._getFileContent(file_id);

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - getFileContent: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }

  /**
   * @swagger
   * /api/openAI/deleteFile:
   *   get:
   *     tags:
   *       - OpenAI
   *     summary: Delete a file.
   *     parameters:
   *       - name: file_id
   *         in: query
   *         required: true
   *         description: The ID of the file to use for this request.
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Deletion status.
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Internal server error
   */
  @httpGet("/deleteFile")
  async deleteFile(
    @response() res: Response,
    @queryParam("file_id") file_id: string
  ) {
    try {
      const result = await this._deleteFile(file_id);

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - deleteFile: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }

  /**
   * @swagger
   * /api/openAI/uploadFile:
   *   post:
   *     tags:
   *       - OpenAI
   *     summary: Returns information about a specific file.
   *     parameters:
   *       - name: file_id
   *         in: query
   *         required: true
   *         description: The ID of the file to use for this request.
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully retrieved file object matching the specified ID.
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Internal server error
   */
  @httpPost("/uploadFile")
  async uploadFile(
    @response() res: Response,
    @requestBody() body: { purpose: string; file: File; filename: string }
  ) {
    try {
      const { purpose, file, filename } = body;
      console.log("purpose purpose", filename);

      const result = await this._uploadFile(purpose, file, filename);

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - uploadFile: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }
}
