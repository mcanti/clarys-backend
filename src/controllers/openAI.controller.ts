import { inject } from "inversify";
import { Readable, PassThrough } from "stream";
import { FileListParams } from "openai/resources";
import express, { Request, Response } from "express";
import multer from "multer";
import fs, { createWriteStream } from "fs";

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

import { Uploadable, toFile } from "openai/uploads";
import { processInBatches } from "../helpers/utilsFunctions.helper";

// const upload = multer();

@controller("/api/openAI")
export class OpenAIController extends BaseHttpController {
  constructor(
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("OpenAIService") private openAIService: OpenAIService
  ) {
    super();
  }

  async _getFile(fileId: string) {
    try {
      const fileResponse = await this.openAIService.getFile(fileId);
      
      return fileResponse;
    } catch (err) {
      console.log("Error - _getFile: ", err);
      return null;
    }
  }

  async _listAllAssistantsFiles() {
    try {
      const assistantsFilesInit = await this.openAIService.listFiles({
        purpose: "assistants",
      });

      const allAssistantsFiles = [];

      if(assistantsFilesInit){
        
        if (assistantsFilesInit.data.length > 0) {
          allAssistantsFiles.push(...assistantsFilesInit.data);
          let hasNextPage = assistantsFilesInit.hasNextPage();
          let nextPageParams = assistantsFilesInit.nextPageParams();
          console.log("nextPageParams", nextPageParams);
          
          
          while (hasNextPage && nextPageParams?.after) {
            console.log("allAssistantsFiles", allAssistantsFiles.length);

            const assistantsFiles =
              await this.openAIService.listFiles({
                purpose: "assistants",
              });

            if (assistantsFiles.data.length > 0) {
              allAssistantsFiles.push(...assistantsFiles.data);
            }

            hasNextPage = assistantsFiles.hasNextPage();
            nextPageParams = assistantsFiles.nextPageParams();
          }

        }
      }

      return allAssistantsFiles;
    } catch (err) {
      console.log("Error - _listAllAssistantsFiles: ", err);
      return null;
    }
  }

  async _listAllVectorStoreFiles() {
    try {
      const vectorStoreFilesInit =
        await this.openAIService.listVectorStoreFiles({
          limit: 100,
        });

      const allVectorStoreFiles = [];

      if (vectorStoreFilesInit) {

        if (vectorStoreFilesInit.data.length > 0) {
          allVectorStoreFiles.push(...vectorStoreFilesInit.data);
          let hasNextPage = vectorStoreFilesInit.hasNextPage();
          let nextPageParams = vectorStoreFilesInit.nextPageParams();

          while (hasNextPage && nextPageParams?.after) {
            const vectorStoreFiles =
              await this.openAIService.listVectorStoreFiles({
                limit: 100,
                after: nextPageParams.after,
              });

            if (vectorStoreFiles.data.length > 0) {
              allVectorStoreFiles.push(...vectorStoreFiles.data);
            }

            hasNextPage = vectorStoreFiles.hasNextPage();
            nextPageParams = vectorStoreFiles.nextPageParams();
          }
          
        }
      }

      for(const file of allVectorStoreFiles){
        await this.openAIService.deleteVectorStoreFile(file.id)
      }

      return allVectorStoreFiles;
    } catch (err) {
      console.log("Error - _listVectorStoreFiles: ", err);
      return [];
    }
  }

  async _deleteVectorStoreFile(fileId: string) {
    try {
      const response = await this.openAIService.deleteVectorStoreFile(fileId);
      return response;
    } catch (err) {
      console.log("Error - _deleteVectorStoreFile: ", err);
      return null;
    }
  }

  async _uploadFilesToOpenAIVectorStore(keysAndNames) {
    try {
      const fileDataArray: Uploadable[] = [];
      for (const keyAndName of keysAndNames) {
        const file = await this.awsStorageService.getFile(keyAndName.key);
        if (file && file.Body) {
          if (!(file.Body instanceof Readable)) {
            console.log("S3 Response body invalid");
          }

          const blobLike = await toFile(
            file.Body as Readable,
            keyAndName.name,
            { type: "application/octet-stream" }
          );
          fileDataArray.push(blobLike);
        }
      }

      console.log(fileDataArray.length);

      //update batch size from env
      await processInBatches(fileDataArray, 10, async (batch) => {
        await this.openAIService.uploadFilesToOpenAIVectorStore({
          files: batch,
        });
      });

      console.log("_uploadFilesToOpenAIVectorStore completed successfully");
    } catch (error) {
      console.error(`Error _uploadFilesToOpenAIVectorStore:`, error);
      return null;
    }
  }

  // Exposing API endpoints

  /**
   * @swagger
   * /api/openAI/listAllAssistantsFiles:
   *   get:
   *     tags:
   *       - OpenAI
   *     summary: List All Assistants Files.
   *     responses:
   *       200:
   *         description: List All Assistants Files.
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Internal server error
   */
  @httpGet("/listAllAssistantsFiles")
  async listAllAssistantsFiles(@response() res: Response) {
    try {
      const result = await this._listAllAssistantsFiles();

      if (result) {
        res.apiSuccess({
          count: result.length,
          AllAssistantsFiles: result,
        });
      }
    } catch (err) {
      console.log("Error - deleteFile: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }

  /**
   * @swagger
   * /api/openAI/listAllVectorStoreFiles:
   *   get:
   *     tags:
   *       - OpenAI
   *     summary: List All Vector Store Files.
   *     responses:
   *       200:
   *         description: List All Vector Store Files.
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Internal server error
   */
  @httpGet("/listAllVectorStoreFiles")
  async listAllVectorStoreFiles(@response() res: Response) {
    try {
      const result = await this._listAllVectorStoreFiles();

      if (result) {
        res.apiSuccess({
          allVectorStoreFiles: result,
        });
      }
    } catch (err) {
      console.log("Error - deleteFile: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }
}
