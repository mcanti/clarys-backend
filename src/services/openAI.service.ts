import { injectable } from "inversify";
import { OpenAI } from "openai";
import { Readable } from "stream";
import axios from "axios";
import https from "https";

import * as process from "process";

import {
  ListFilesParamsInterface,
  GetFileParamsInterface,
  GetFileContentParamsInterface,
  DeleteFileParamsInterface,
  UploadFileBodyParamsInterface,
  AddFileToVectorStoreBodyParamsInterface,
  AddFilesBatchToVectorStoreBodyParamsInterface,
  ListVectorStoreFilesParamsInterface,
  DeleteVectorStoreFileParamsInterface,
} from "../interfaces/openAI.interfaces";
import { fileToBlob } from "../helpers/jsonConvertor.helper";
import pino from "pino";

if (!process.env.OPENAI_API_KEY) {
  throw Error("OPENAI_API_KEY missing");
}

if (!process.env.VECTOR_STORE_ID) {
  throw Error("VECTOR_STORE_ID missing");
}

const logger = pino(
  {
    level: "info",
  },
  pino.destination("logs.json")
);

function logResponse(response) {
  logger.info(response, "OPEN AI API Response");
}

@injectable()
export class OpenAIService {
  private apiKey: string;
  private vectorStoreId: string;
  private openai: OpenAI;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY as string;
    this.vectorStoreId = process.env.VECTOR_STORE_ID as string;
    this.openai = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  async listFiles(params: ListFilesParamsInterface) {
    try {
      const axiosInstance = axios.create({
        timeout: 300000, // 5-minute timeout
      });

      const response = await axiosInstance.get(
        "https://api.openai.com/v1/files",
        {
          params: params,
          maxBodyLength: Infinity,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: process.env.NODE_ENV !== "production",
          }),
        }
      );

      return response.data ?? response;
    } catch (err) {
      logResponse(err);
      return {
        error:
          err.response?.data ||
          "An error occurred during the listFiles request.",
        statusCode: err.response?.status,
      };
    }
  }

  async getFile(params: GetFileParamsInterface) {
    try {
      const response = await axios.get(
        `https://api.openai.com/v1/files/${params.file_id}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // Ignore SSL certificate errors
          }),
        }
      );

      return response.data ?? {};
    } catch (err) {
      console.log("Error - getFile: ", err);
      return {};
    }
  }

  async getFileContent(params: GetFileContentParamsInterface) {
    try {
      const response = await axios.get(
        `https://api.openai.com/v1/files/${params.file_id}/content`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // Ignore SSL certificate errors
          }),
        }
      );

      return response.data ?? {};
    } catch (err) {
      console.log("Error - getFileContent: ", err);
      return {};
    }
  }

  async deleteFile(params: DeleteFileParamsInterface) {
    try {
      const axiosInstance = axios.create({
        timeout: 300000, // 5-minute timeout
      });

      const response = await axiosInstance.delete(
        `https://api.openai.com/v1/files/${params.file_id}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: process.env.NODE_ENV !== "production",
          }),
        }
      );

      if (response && response?.data) {
        return response.data;
      }

      return response;
    } catch (err) {
      // logResponse(err);
      return {
        error: err.response?.data || "An error occurred during the deleteFile.",
        statusCode: err.response?.status,
      };
    }
  }

  async uploadFile(params: UploadFileBodyParamsInterface) {
    try {
      const response =
        await this.openai.beta.vectorStores.fileBatches.uploadAndPoll(
          this.vectorStoreId,
          {
            files: [params.file],
          },
        );

      return response ?? null;
    } catch (err) {
      logResponse({
        error: err.response?.data || "An error occurred during the upload.",
        statusCode: err.response?.status || "No Status",
      });
      return {
        error: err.response?.data || "An error occurred during the upload.",
        statusCode: err.response?.status,
      };
    }
  }

  async createVectorStoreFile(params: AddFileToVectorStoreBodyParamsInterface) {
    try {
      const axiosInstance = axios.create({
        timeout: 300000, // 5-minute timeout
      });

      const response = await axiosInstance.post(
        `https://api.openai.com/v1/vector_stores/${this.vectorStoreId}/files`,
        { ...params },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
          httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: process.env.NODE_ENV !== "production",
          }),
        }
      );

      if (response && response?.data) {
        return response.data;
      }

      return response;
    } catch (err) {
      // logResponse(err);
      return {
        error:
          err.response?.data ||
          "An error occurred during the createVectorStoreFile.",
        statusCode: err.response?.status,
      };
    }
  }

  async createVectorStoreFilesBatch(
    params: AddFilesBatchToVectorStoreBodyParamsInterface
  ) {
    try {
      const axiosInstance = axios.create({
        timeout: 300000, // 5-minute timeout
      });

      const response = await axiosInstance.post(
        `https://api.openai.com/v1/vector_stores/${this.vectorStoreId}/file_batches`,
        { ...params },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
          httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: process.env.NODE_ENV !== "production",
          }),
        }
      );

      if (response && response?.data) {
        return response.data;
      }

      return response;
    } catch (err) {
      logResponse(err);
      return {
        error:
          err.response?.data ||
          "An error occurred during the createVectorStoreFilesBatch.",
        statusCode: err.response?.status,
      };
    }
  }

  async listVectorStoreFiles(params: ListVectorStoreFilesParamsInterface) {
    try {
      const axiosInstance = axios.create({
        timeout: 300000, // 5-minute timeout
      });

      const response = await axiosInstance.get(
        ` https://api.openai.com/v1/vector_stores/${this.vectorStoreId}/files`,
        {
          params: params,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
          httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: process.env.NODE_ENV !== "production",
          }),
        }
      );

      if (response && response?.data) {
        return response.data;
      }

      return response;
    } catch (err) {
      logResponse(err);
      return {
        error:
          err.response?.data ||
          "An error occurred during the listVectorStoreFiles.",
        statusCode: err.response?.status,
      };
    }
  }

  async deleteVectorStoreFile(params: DeleteVectorStoreFileParamsInterface) {
    try {
      const response = await axios.delete(
        `https://api.openai.com/v1/vector_stores/${this.vectorStoreId}/files/${params.file_id}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: process.env.NODE_ENV !== "production",
          }),
        }
      );

      if (response && response?.data) {
        return response.data;
      }

      return response;
    } catch (err) {
      logResponse(err);
      return {
        error:
          err.response?.data ||
          "An error occurred during the deleteVectorStoreFile.",
        statusCode: err.response?.status,
      };
    }
  }
}
